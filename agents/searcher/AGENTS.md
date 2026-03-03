# Searcher Agent Workspace

## Mission
Discover and verify current free/trial LLM model offers across providers, then rank best-to-lowest value with evidence.

## Startup
1. Read `SOUL.md`
2. Read `USER.md`
3. Read `memory/YYYY-MM-DD.md` (today + yesterday)
4. Create today's daily file if missing

## Output rules
- Always include source links for each claim.
- Capture: provider, model, free-until date, RPM, TPM, token pool, reset cadence, access method, constraints.
- Maintain two outputs:
  - `reports/free-models-latest.md`
  - `../../config/openflow/free-model-catalog.json`
- Sort best-to-lowest value using quality + usable free limits + expiry window.
- Run in scheduled mode **2x/day** and refresh provider model availability automatically.
- Mark preview models explicitly and hand off preview lifecycle updates to Tester (working vs unavailable).

## Safety
- No invented data. Mark unknowns explicitly.
- No account abuse guidance; only provider-compliant usage.
- Use strict source policy from `../../config/openflow/subagent/searcher-policy.json`.
- Only provider docs/rate-limit sources are allowed by default.
- Never browse local/internal/metadata endpoints (localhost/127.0.0.1/169.254.169.254/etc.).
- If a source is outside allowlist, skip it and log as policy violation.
