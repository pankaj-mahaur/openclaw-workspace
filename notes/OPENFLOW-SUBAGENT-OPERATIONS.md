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

- Providers: **Groq + Gemini + NVIDIA**
- Groq quality shortlist enabled (weak/specialized models excluded from default routing).
- Groq accounts: `gmail_1..gmail_6` slots configured.
- Gemini accounts: active `gmail_1,gmail_2,gmail_3,gmail_5` (gmail_4 hard-disabled for repeated quota failures).
- NVIDIA accounts: active `gmail_1,gmail_2` (keyed), slots reserved `gmail_3..gmail_6`.
- Mode: **best-of-best quality-first**
  - Groq primary: `meta-llama/llama-4-maverick-17b-128e-instruct`
  - Groq secondary (throughput fallback): `meta-llama/llama-4-scout-17b-16e-instruct`
  - Gemini active model: `models/gemini-2.5-flash` (Pro removed from active config after consistent fail/quota results)
  - NVIDIA inventory: live `/v1/models` discovery from Build key (chat-capable inventory stored, broad enabled with failed models removed)
  - Live-search validated baseline limits used in OF-Guard config:
    - `models/gemini-2.5-flash`: 10 RPM / 250k TPM / 250 RPD
  - NVIDIA limits: provider does not expose stable public per-model RPM/TPM table in docs/API; runtime headers currently empty on probes, so limits remain null and guarded by health checks + model shortlist.
  - Note: current Google docs route exact per-model limits to AI Studio rate-limit page; treat config values as guard baselines and re-verify in AI Studio for each project/tier.

## 3) Core Commands

All `subagent-*` wrappers now auto-load `config/openflow/subagent/keys.env` when present, so manual `source` is no longer required for normal CLI usage.

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

# optional: worker-aware route acquisition (helps spread workers across different mail/account slots)
scripts/openflow/subagent-router.sh acquire-route --needTokens 900 --needRequests 1 --worker search-engine

# after response, reconcile actual token usage
scripts/openflow/subagent-router.sh settle \
  --provider groq --model meta-llama/llama-4-maverick-17b-128e-instruct --account gmail_1 \
  --estimatedTokens 900 --actualTokens 742

# inspect gate state
scripts/openflow/subagent-router.sh status

# prune stale/non-configured gate entries (optional manual cleanup)
scripts/openflow/subagent-router.sh prune --maxAgeHours 72

# easiest end-to-end (acquire + API call + settle)
scripts/openflow/subagent-safe-chat.sh --message "hello" --maxTokens 120

# worker-aware end-to-end call (keeps account spread stable per worker)
scripts/openflow/subagent-safe-chat.sh --worker summarizer --message "hello" --maxTokens 120
```

Router allocator behavior (for speed via account spread):
- Quality score remains primary.
- Hot routes and recently used same model/account get penalty.
- Router rotates across account slots for same top model to reduce serial bottlenecks.
- Optional `--worker` applies sticky affinity per worker while still avoiding collisions with other workers.

### Health + rate headers
```bash
scripts/openflow/subagent-tester.sh --provider <id> --model <id> --account <id> --probe chat
scripts/openflow/subagent-tester-matrix.sh              # enabled model/account combos with keys (provider caps applied)
scripts/openflow/subagent-tester-scheduled.sh           # active-route + matrix wrapper
scripts/openflow/subagent-rate-probe.sh --provider <id> --model <id> --account <id>
```

Matrix-load guard (to keep VPS light when provider inventories are huge):
- `OPENFLOW_TESTER_MATRIX_MAX_PER_PROVIDER` (default `60`)
- `OPENFLOW_TESTER_MATRIX_MAX_NVIDIA` (default `20`)
- Active route model is always included even if outside cap.

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
40 3,15 * * * /root/.openclaw/workspace/scripts/openflow/searcher-daily-sync.sh >> /root/.openclaw/workspace/logs/searcher-daily-sync.log 2>&1 && node /root/.openclaw/workspace/scripts/openflow/searcher-policy-check.js >> /root/.openclaw/workspace/logs/searcher-policy.log 2>&1
50 3,15 * * * /root/.openclaw/workspace/scripts/openflow/subagent-tester-scheduled.sh
@reboot /root/.openclaw/workspace/scripts/openflow/dashboard-start.sh
```

Current load-shed state (2026-03-03 UTC):
- OF dashboard manually stopped.
- OpenFlow cron entries temporarily removed from active crontab to reduce VPS load.
- Restore source: `config/openflow/subagent/cron-backup-20260303T145348Z.txt`.

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
   - prune stale/non-configured rate-gate routes (72h default)
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
- live subagent model usage (router + role routing + tester/searcher status)
- daily sync diff (added/removed/changed)
- quality/model tables
- account health feed
- rate-gate state

Dashboard UX/runtime notes (latest):
- Default live refresh: **10s** with low-load strategy
  - `/api/pack/live` on frequent ticks
  - `/api/pack/full` periodic full sync (~60s at 10s interval)
- Background-tab auto slowdown to reduce VPS load (>=30s effective interval).
- Account Health Feed is compact by default:
  - row limit selector (25/50/100/all)
  - fail-first toggle
  - provider summary chips
  - fixed-height scroll container
- Policy + Live Events overflow is handled via responsive grid + wrapped log blocks.
- Theme direction: dark premium black-glass morphism (responsive, high-contrast, minimal clutter).

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

Paplupal orchestration runbook:
- `notes/PAPLUPAL-ORCHESTRATION.md`

Model preference is role-specific (quality/throughput balanced) and still enforced through OF-Guard routing + key pool.

Role context files (new):
- Search Engine: `agents/search-engine/{AGENTS.md,SOUL.md,HEARTBEAT.md,MEMORY.md}`
- Web Crawler: `agents/web-crawler/{AGENTS.md,SOUL.md,HEARTBEAT.md,MEMORY.md}`
- Summarizer: `agents/summarizer/{AGENTS.md,SOUL.md,HEARTBEAT.md,MEMORY.md}`
- Context references are tracked in `config/openflow/subagent/role-pipeline.json` via `contextFiles` per role.
