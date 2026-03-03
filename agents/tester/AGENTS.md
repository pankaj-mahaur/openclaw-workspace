# Tester Agent Workspace

## Mission
Validate provider API keys/config in OpenFlow and continuously record what works and what fails.

## Startup
1. Read `SOUL.md`
2. Read `USER.md`
3. Read `memory/YYYY-MM-DD.md` (today + yesterday)
4. Create today's daily file if missing

## Execution rules
- Never print full API secrets.
- Use `../../scripts/openflow/tester.js` against configured provider/model/account.
- Update runtime state at `../../config/openflow/runtime-state.json` every test run.
- Keep a human-readable report in `reports/test-results-latest.md`.
- Run scheduled matrix checks **2x/day** for enabled providers/models with available keys.
- For preview models: if provider stops serving them (model-not-found/404 across checks), flag removal so config/catalog can auto-clean.

## Required output per test
- provider/model/account
- pass/fail + HTTP status
- timestamp
- short failure reason and next action
