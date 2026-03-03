# OpenFlow Multi-Provider Control Plane

This directory contains the master configuration and runtime state for provider/model discovery, testing, and automatic model selection.

## Important compliance note
Use only provider-approved APIs/accounts under each provider's Terms of Service. Do not use this system to bypass quotas, abuse trials, or evade policy restrictions.

## Files
- `master-config.json` — **main-session default** control-plane config
- `runtime-state.json` — **main-session default** runtime state
- `free-model-catalog.json` — generated/updated by Searcher agent with latest free/trial offers
- `subagent/master-config.json` — subagent-only provider/model config (can include experimental/free-tier routing)
- `subagent/runtime-state.json` — subagent-only runtime state
- `subagent/free-model-catalog.json` — subagent copy of model catalog
- `subagent/daily-sync-latest.json` — latest 1/day searcher sync diff (added/removed/changed)
- `subagent/tasks/*.json` — persisted task checkpoints and resume tokens

## Quick start
1. Fill account env vars in shell or `.env` loader:
   - `OPENAI_API_KEY_GMAIL1`, `OPENAI_API_KEY_GMAIL2`, ...
   - add other provider keys as needed
2. Update `master-config.json` with provider/model metadata.
3. Run tester:
   - `node scripts/openflow/tester.js --provider openai --model openai-codex/gpt-5.3-codex --account gmail_1`
4. Pick active model automatically:
   - `node scripts/openflow/controller.js select`
5. Manage gateway:
   - `node scripts/openflow/controller.js gateway status|start|stop|restart`

## Subagent-only execution (isolated config/state)
Use wrappers so subagent experiments never mutate main defaults:
- `scripts/openflow/subagent-controller.sh status|select|select-next|quota|maybe-switch|gateway status`
- `scripts/openflow/subagent-tester.sh --provider groq --model meta-llama/llama-4-maverick-17b-128e-instruct --account gmail_1`
- `scripts/openflow/subagent-rate-probe.sh --provider groq --model meta-llama/llama-4-maverick-17b-128e-instruct --account gmail_1`
- `scripts/openflow/subagent-router.sh acquire-route|settle|status|prune` (strict RPM/TPM gate)
- `scripts/openflow/subagent-safe-chat.sh --message "..."` (gated request path)

Wrappers auto-load `config/openflow/subagent/keys.env` when available.

### Pre-limit switching workflow (subagent)
1. Probe live rate headers:
   - `subagent-rate-probe.sh ...`
2. Check usage snapshot:
   - `subagent-controller.sh quota ...`
3. Trigger switch only when threshold hit (config `routing.switchBeforePercent`, default 85):
   - `subagent-controller.sh maybe-switch ...`
4. Force rotate manually anytime:
   - `subagent-controller.sh select-next ...`
5. One-shot auto probe + conditional switch:
   - `scripts/openflow/subagent-autoswitch.sh`
6. **Hard RPM/TPM gate for every request (recommended):**
   - acquire slot: `subagent-router.sh acquire-route --needTokens <estimate> --needRequests 1`
   - settle actual usage: `subagent-router.sh settle --provider ... --model ... --account ... --estimatedTokens ... --actualTokens ...`
   - easiest path: use `subagent-safe-chat.sh` which performs acquire + request + settle automatically.
7. Guard long-running tasks from mid-run switching:
   - start task + lock + token: `scripts/openflow/subagent-task-start.sh 90 "my-task"`
   - milestone autosave during work (recommended): `scripts/openflow/subagent-task-autosave.sh "phase 1 completed" active 35`
   - manual/force checkpoint if needed: `scripts/openflow/subagent-task-save.sh "critical save" active 36 force`
   - get resume block/token: `scripts/openflow/subagent-task-checkpoint.sh resume --task active`
   - end task (complete + unlock + autoswitch check): `scripts/openflow/subagent-task-end.sh "task complete" active`
   - inspect guard: `scripts/openflow/subagent-controller.sh guard`

### Cron (subagent autoswitch)
- Installed: `* * * * * /root/.openclaw/workspace/scripts/openflow/subagent-autoswitch-cron.sh`
- Strict audit: `* * * * * /root/.openclaw/workspace/scripts/openflow/subagent-strict-audit.sh`
- Daily maintenance: `15 2 * * * /root/.openclaw/workspace/scripts/openflow/subagent-maintenance.sh`
- Daily searcher refresh (1/day): `40 3 * * * /root/.openclaw/workspace/scripts/openflow/searcher-daily-sync.sh >> /root/.openclaw/workspace/logs/searcher-daily-sync.log 2>&1 && node /root/.openclaw/workspace/scripts/openflow/searcher-policy-check.js >> /root/.openclaw/workspace/logs/searcher-policy.log 2>&1`
- Dashboard autostart: `@reboot /root/.openclaw/workspace/scripts/openflow/dashboard-start.sh`
- Cron sources `config/openflow/subagent/keys.env` and appends sparse event logs to `logs/subagent-autoswitch.log`.

### GUI Dashboard
- Start: `scripts/openflow/dashboard-start.sh`
- Status: `scripts/openflow/dashboard-status.sh`
- Stop: `scripts/openflow/dashboard-stop.sh`
- URL (default local): `http://127.0.0.1:18888`
- Token auth/env: `config/openflow/subagent/dashboard.env`
