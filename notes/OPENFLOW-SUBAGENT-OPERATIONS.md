# OpenFlow Subagent Operations Manual (Paplu)

Updated: 2026-03-03 UTC

## 1) Scope Separation (Important)

- **Main/default config (untouched for subagent experiments):**
  - `config/openflow/master-config.json`
  - `config/openflow/runtime-state.json`
- **Subagent-only config/state (all free-tier multi-key routing):**
  - `config/openflow/subagent/master-config.json`
  - `config/openflow/subagent/runtime-state.json`
  - `config/openflow/subagent/free-model-catalog.json`
  - `config/openflow/subagent/tasks/*.json`

## 2) Current Subagent Provider Setup

- Provider: **Groq**
- Quality shortlist enabled (weak/specialized models excluded from default routing).
- Accounts: `gmail_1..gmail_6` tested.
- Mode: **best-of-best quality-first**
  - Primary: `meta-llama/llama-4-maverick-17b-128e-instruct`
  - Secondary (throughput fallback): `meta-llama/llama-4-scout-17b-16e-instruct`

## 3) Core Commands

### Status / selection / quota
```bash
scripts/openflow/subagent-controller.sh status
scripts/openflow/subagent-controller.sh select
scripts/openflow/subagent-controller.sh select-next <provider> <model> <account>
scripts/openflow/subagent-controller.sh quota <provider> <model> <account>
scripts/openflow/subagent-controller.sh maybe-switch <provider> <model> <account>
scripts/openflow/subagent-controller.sh guard
```

### Strict RPM/TPM gating (hard preflight)
```bash
# reserve budget + route (before sending request)
scripts/openflow/subagent-router.sh acquire-route --needTokens 900 --needRequests 1

# after response, reconcile actual token usage
scripts/openflow/subagent-router.sh settle \
  --provider groq --model meta-llama/llama-4-maverick-17b-128e-instruct --account gmail_1 \
  --estimatedTokens 900 --actualTokens 742

# inspect gate state
scripts/openflow/subagent-router.sh status

# easiest end-to-end (acquire + API call + settle)
scripts/openflow/subagent-safe-chat.sh --message "hello" --maxTokens 120
```

### Health + rate headers
```bash
scripts/openflow/subagent-tester.sh --provider <id> --model <id> --account <id>
scripts/openflow/subagent-rate-probe.sh --provider <id> --model <id> --account <id>
```

### Task-safe execution (checkpoint/resume)
```bash
# start task + lock + token
scripts/openflow/subagent-task-start.sh 90 "task-name"

# milestone-based autosave (recommended)
scripts/openflow/subagent-task-autosave.sh "phase 1 completed" active 20

# manual save (same engine)
scripts/openflow/subagent-task-save.sh "step done" active 35

# force save (if needed)
scripts/openflow/subagent-task-save.sh "critical save" active 36 force

# show resume block/token
scripts/openflow/subagent-task-checkpoint.sh resume --task active

# complete task + unlock + autoswitch check
scripts/openflow/subagent-task-end.sh "task complete" active
```

## 4) Cron Jobs

Installed cron entries:
```cron
* * * * * /root/.openclaw/workspace/scripts/openflow/subagent-autoswitch-cron.sh
* * * * * /root/.openclaw/workspace/scripts/openflow/subagent-strict-audit.sh
15 2 * * * /root/.openclaw/workspace/scripts/openflow/subagent-maintenance.sh
40 3 * * * /root/.openclaw/workspace/scripts/openflow/searcher-daily-sync.sh >> /root/.openclaw/workspace/logs/searcher-daily-sync.log 2>&1 && node /root/.openclaw/workspace/scripts/openflow/searcher-policy-check.js >> /root/.openclaw/workspace/logs/searcher-policy.log 2>&1
@reboot /root/.openclaw/workspace/scripts/openflow/dashboard-start.sh
```

### Strict mode enforcement
- `strictMode.enabled=true` in `config/openflow/subagent/master-config.json`
- Direct ungated CLI calls to provider APIs are audited every minute.
- If process command includes provider API domain and not allowlisted gated paths, process is terminated and logged to:
  - `logs/subagent-strict-audit.log`

## 5) Anti-Disruption Design (mid-task switch problem)

### Problem
If switching happens in the middle of a long task, flow can break.

### Implemented solution
1. Task start creates lock (`guard.locked=true`)
2. If quota threshold reached during lock:
   - switch is **deferred**
   - `guard.pendingSwitch` is recorded
3. Task end:
   - marks complete
   - unlocks guard
   - runs autoswitch check

This prevents mid-task disruption while still preparing failover.

## 6) Token/Context/Storage Optimization (your concern)

To avoid unnecessary bloat:

1. **Milestone-based autosave policy (default)**
   - interval target: ~25 min (`1500s`)
   - progress jump target: `>=12%`
   - milestone summaries bypass debounce (phase/completed/final/etc.)
2. **Checkpoint summary cap**
   - default max chars: `220`
3. **Progress-noise filter**
   - tiny progress updates (`<12%`) can be skipped when too soon
4. **Max checkpoints per task**
   - default cap: `30` (older checkpoints trimmed automatically)
5. **Sparse cron logging**
   - autoswitch cron logs only meaningful events (switch/defer/error)
6. **Daily maintenance**
   - prune old completed/failed task files (14d)
   - compact autoswitch log if >2MB

These reduce file growth and avoid unnecessary context load.

## 7) Env File for Subagent Cron

- `config/openflow/subagent/keys.env`
- chmod: `600`
- Used only by subagent cron/scripts.

## 8) GUI Dashboard (live)

Dashboard server:
```bash
scripts/openflow/dashboard-start.sh
scripts/openflow/dashboard-status.sh
scripts/openflow/dashboard-stop.sh
```

Default URL:
- `http://127.0.0.1:18888`
- Public (this host): `http://31.97.233.48:18888/?token=<OPENFLOW_DASHBOARD_TOKEN>`

Dashboard auth is token-protected via:
- `config/openflow/subagent/dashboard.env`

Shows:
- active route + guard state
- daily sync diff (added/removed/changed)
- quality shortlist table
- Groq account health table
- rate-gate state

## 9) Quick Troubleshooting

### A) Why switch not happening?
- Check guard lock:
  ```bash
  scripts/openflow/subagent-controller.sh guard
  ```
- If locked, switch may be deferred intentionally.

### B) Why no quota %?
- Run live probe first:
  ```bash
  scripts/openflow/subagent-rate-probe.sh --provider ... --model ... --account ...
  ```

### C) Resume from previous context
- Use:
  ```bash
  scripts/openflow/subagent-task-checkpoint.sh resume --task <taskId|token|active>
  ```

## 10) Security Notes

- Keep keys in env/keys file only; never print full keys in reports.
- Rotate keys if ever posted in chat.
- Main/default route stays isolated from subagent free-tier experiments.

### Searcher anti-malicious policy
- Policy file: `config/openflow/subagent/searcher-policy.json`
- Enforced checker: `scripts/openflow/searcher-policy-check.js`
- Blocks/flags:
  - non-allowlisted evidence domains
  - internal/local/metadata endpoints
  - forbidden security-abuse keywords in catalog/report outputs
- Logs:
  - `logs/searcher-policy.log`

## 11) Default Role Pipeline (new default)

OF-Guard now defaults to a 3-role divided workflow:

1. **Search Engine**
   - Finds latest and high-trust links only.
   - Output: concise link pack (title/url/relevance/freshness).
2. **Web Crawler**
   - Consumes trusted links and extracts structured facts.
   - Output: grouped facts + conflicts/unknowns with source mapping.
3. **Summarizer**
   - Produces final user-ready answer based on original question.
   - Output: executive summary + key takeaways + risks + top sources.

Pipeline spec file:
- `config/openflow/subagent/role-pipeline.json`

Model preference is role-specific (quality/throughput balanced) and still enforced through OF-Guard routing + key pool.
