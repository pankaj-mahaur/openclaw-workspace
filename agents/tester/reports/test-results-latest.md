# API Test Results — Latest

> Updated: 2026-03-03 10:06 UTC
> Scope: baseline OpenFlow control-plane validation

## PASS/FAIL Matrix

| Check | Result | Evidence |
|---|---|---|
| Config review: `config/openflow/master-config.json` | PASS | Parsed successfully; routing/gateway/provider/tester sections present. |
| Script review: `scripts/openflow/controller.js` | PASS | Commands available: `status`, `select`, `mark-success`, `mark-failure`, `gateway`. |
| Script review: `scripts/openflow/tester.js` | PASS | Supports `--provider --model --account`; writes health/tests when API call executes. |
| Controller status check | PASS | Active shown as `openai-codex / openai-codex/gpt-5.3-codex / -`; candidates listed. |
| Gateway status check | PASS | `openclaw gateway` runtime is `running`, RPC probe `ok`, listening `127.0.0.1:18789`. |
| Tester run: `openai / openai-codex/gpt-5.3-codex / gmail_1` | FAIL (expected pending input) | `ERROR: Missing env var OPENAI_API_KEY_GMAIL1` |
| Runtime state update via script only | PASS | Recorded failure using controller script `mark-failure` (no manual file edit). |

## Commands Executed

```bash
node scripts/openflow/controller.js status
node scripts/openflow/controller.js gateway status
node scripts/openflow/tester.js --provider openai --model openai-codex/gpt-5.3-codex --account gmail_1
node scripts/openflow/controller.js mark-failure openai openai-codex/gpt-5.3-codex gmail_1 "Missing env var OPENAI_API_KEY_GMAIL1 (expected pending input)"
```

## Exact Next Inputs Needed From User

1. Provide/set environment variable:
   - `OPENAI_API_KEY_GMAIL1=<valid OpenAI API key for account gmail_1>`
2. Re-run tester command after variable is present:
   - `node scripts/openflow/tester.js --provider openai --model openai-codex/gpt-5.3-codex --account gmail_1`

## Delta Update (2026-03-03 07:16 UTC)

| Check | Result | Evidence |
|---|---|---|
| Config extended with `cerebras` provider | PASS | Added provider base URL `https://api.cerebras.ai/v1`, accounts `CEREBRAS_API_KEY_GMAIL1..6`, and models `gpt-oss-120b`, `gpt-oss-20b`. |
| Tester run: `cerebras / gpt-oss-120b / gmail_1` | FAIL | API returned `401` with `Wrong API Key` (invalid key or mismatch). |

### Command (redacted)

```bash
CEREBRAS_API_KEY_GMAIL1=*** node scripts/openflow/tester.js --provider cerebras --model gpt-oss-120b --account gmail_1
```

### Next action

- Provide a fresh/valid Cerebras key for `gmail_1`, then rerun:
  - `node scripts/openflow/tester.js --provider cerebras --model gpt-oss-120b --account gmail_1`

## Delta Update (2026-03-03 07:20 UTC)

| Check | Result | Evidence |
|---|---|---|
| Re-test with newly shared Cerebras key: `cerebras / gpt-oss-120b / gmail_1` | FAIL | `401 Wrong API Key` from tester script. |
| Direct API verification (`GET /v1/models`) with same key | FAIL | `401 Wrong API Key` confirms credential invalid/mismatched for Cerebras API. |

### Commands (redacted)

```bash
CEREBRAS_API_KEY_GMAIL1=*** node scripts/openflow/tester.js --provider cerebras --model gpt-oss-120b --account gmail_1
python requests GET https://api.cerebras.ai/v1/models (Authorization: Bearer ***)
```

### Next action

- Regenerate Cerebras API key from Cerebras dashboard (ensure it is **Inference API** key), then retest.
- Cross-check with provider official curl sample (same result currently 401), indicating config path is likely correct and credential issue remains.

## Delta Update (2026-03-03 07:23 UTC)

| Check | Result | Evidence |
|---|---|---|
| Official Cerebras sample request (`POST /v1/chat/completions` with Bearer key) | FAIL | `401 Wrong API Key`, same as tester script. |
| Header variant check (`x-api-key`) | FAIL | `403 Not authenticated`; docs require Bearer auth. |

## Delta Update (2026-03-03 07:28 UTC)

| Check | Result | Evidence |
|---|---|---|
| Config extended with `groq` provider | PASS | Added `https://api.groq.com/openai/v1`, account slots `GROQ_API_KEY_GMAIL1..6`, and two ranked free-tier models. |
| Tester run: `groq / llama-3.1-8b-instant / gmail_1` | PASS | `PASS 200` from `scripts/openflow/tester.js`. |
| Direct completion: `llama-3.1-8b-instant` | PASS | `200 OK` from `POST /openai/v1/chat/completions`. |
| Direct completion: `meta-llama/llama-4-scout-17b-16e-instruct` | PASS | `200 OK` from `POST /openai/v1/chat/completions`. |
| Auto-select best candidate | PASS | `controller.js select` set active route to `groq / llama-3.1-8b-instant / gmail_1`. |

## Delta Update (2026-03-03 07:33 UTC)

| Check | Result | Evidence |
|---|---|---|
| Controller scoring fix (catalog provider case-insensitive + model `enabled:false` skip) | PASS | `controller.js` updated; status now correctly ranks Groq candidates by catalog scores. |
| Groq quality-only shortlist applied in master config | PASS | Weak/specialized models removed from routing; 6 strong models retained. |
| Tester run: `groq / meta-llama/llama-4-scout-17b-16e-instruct / gmail_1` | PASS | `PASS 200` from tester script. |
| Active route reselection | PASS | Active switched to `groq / meta-llama/llama-4-scout-17b-16e-instruct / gmail_1`. |

## Delta Update (2026-03-03 07:56 UTC)

| Check | Result | Evidence |
|---|---|---|
| Tester run: `groq / meta-llama/llama-4-scout-17b-16e-instruct / gmail_2` | PASS | `PASS 200` from tester script. |
| Tester run: `groq / meta-llama/llama-4-scout-17b-16e-instruct / gmail_3` | PASS | `PASS 200` from tester script. |
| Direct completion smoke test with `gmail_2` key | PASS | `200 OK` on Groq chat completions endpoint. |
| Direct completion smoke test with `gmail_3` key | PASS | `200 OK` on Groq chat completions endpoint. |
| Runtime health marks | PASS | `mark-success` set for `groq:meta-llama/llama-4-scout-17b-16e-instruct` on `gmail_2` and `gmail_3`. |

## Delta Update (2026-03-03 08:28 UTC)

| Check | Result | Evidence |
|---|---|---|
| Updated Groq key for `gmail_1` retest | PASS | `PASS 200` on `meta-llama/llama-4-scout-17b-16e-instruct`. |
| Added Groq key for `gmail_4` | PASS | `PASS 200` on tester run. |
| Added Groq key for `gmail_5` | PASS | `PASS 200` on tester run. |
| Added Groq key for `gmail_6` | PASS | `PASS 200` on tester run. |
| Re-test existing `gmail_3` | PASS | `PASS 200` on tester run. |
| Re-test existing `gmail_2` | FAIL | `401 invalid_api_key` returned by Groq API. |

### Next action

- Reissue/verify `gmail_2` Groq key and rerun tester for that account.

## Delta Update (2026-03-03 08:36 UTC)

| Check | Result | Evidence |
|---|---|---|
| Re-test with new Groq key for `gmail_2` (subagent isolated flow) | PASS | `PASS 200` on `meta-llama/llama-4-scout-17b-16e-instruct`. |
| Subagent candidate health snapshot across Groq accounts | PASS | `gmail_1..gmail_6` now all healthy/available for shortlisted model. |

## Delta Update (2026-03-03 08:44 UTC)

| Check | Result | Evidence |
|---|---|---|
| Added live rate-limit probe script (subagent-isolated) | PASS | `scripts/openflow/subagent-rate-probe.sh` captures `x-ratelimit-*` headers into subagent runtime state. |
| Quota visibility command | PASS | `subagent-controller.sh quota ...` now prints used % + latest headers. |
| Pre-limit switch command | PASS | `subagent-controller.sh maybe-switch ...` switches only when usage >= threshold or health fail. |
| Manual forced rotation | PASS | `subagent-controller.sh select-next ...` moved active account from gmail_1 to gmail_2 (verified), then back via `select`. |
| One-shot auto probe + conditional switch | PASS | `subagent-autoswitch.sh` performs rate probe and runs `maybe-switch` on active route. |

## Delta Update (2026-03-03 08:55 UTC)

| Check | Result | Evidence |
|---|---|---|
| Subagent autoswitch cron installed | PASS | Root crontab includes `* * * * * /root/.openclaw/workspace/scripts/openflow/subagent-autoswitch-cron.sh`. |
| Live rate-limit header capture | PASS | `subagent-rate-probe.sh` captured `x-ratelimit-limit-*`, `remaining-*`, `reset-*` for active Groq route. |
| Guard lock/unlock flow for task safety | PASS | `subagent-task-start.sh` set lock; `subagent-task-end.sh` unlocked and ran autoswitch check. |
| Mid-task disruption mitigation | PASS | `maybe-switch` now defers quota-based switching when guard lock is active; resumes checks post-unlock. |

## Delta Update (2026-03-03 09:02 UTC)

| Check | Result | Evidence |
|---|---|---|
| Task checkpoint/resume framework added | PASS | `scripts/openflow/task-checkpoint.js` + `subagent-task-checkpoint.sh` with start/checkpoint/resume/complete/fail/list/show. |
| Start/save/resume workflow smoke test | PASS | Created demo task, saved checkpoint (35%), generated resume context block + token. |
| Lock-safe switching behavior | PASS | With active lock and simulated near-limit usage, `maybe-switch` deferred and wrote `pendingSwitch` instead of mid-task switching. |
| Task end flow | PASS | `subagent-task-end.sh` completed task, unlocked guard, ran autoswitch, cleared pending switch state. |

## Delta Update (2026-03-03 09:14 UTC)

| Check | Result | Evidence |
|---|---|---|
| Milestone-based autosave defaults enabled | PASS | Checkpoint engine defaults set to ~25 min interval + 12% progress delta + milestone bypass regex. |
| Autosave debounce smoke test | PASS | Immediate non-milestone follow-up checkpoint was skipped (`reason=debounce`). |
| Consolidated operations doc refreshed | PASS | `notes/OPENFLOW-SUBAGENT-OPERATIONS.md` updated with autosave + anti-bloat controls. |

## Delta Update (2026-03-03 09:27 UTC)

| Check | Result | Evidence |
|---|---|---|
| Strict RPM/TPM preflight gate implemented | PASS | Added `scripts/openflow/router.js` + wrapper `subagent-router.sh` with acquire-route/settle/status. |
| Gated request path | PASS | Added `subagent-safe-chat.sh` (acquire budget -> API call -> settle actual tokens). |
| Gate smoke test | PASS | Acquire reserved `needTokens=700` on Maverick route; safe chat succeeded and gate usage counters updated. |
| Quality-first active route | PASS | Subagent active now `groq/meta-llama/llama-4-maverick-17b-128e-instruct/gmail_1`. |

## Delta Update (2026-03-03 09:35 UTC)

| Check | Result | Evidence |
|---|---|---|
| Wrapper-only strict mode flag enabled | PASS | `strictMode.enabled=true` in subagent master config with `allowUngatedCalls=false`. |
| Process-level ungated direct-call audit | PASS | Added `subagent-strict-audit.sh` + cron every minute. |
| Strict-mode cron installation | PASS | Crontab includes autoswitch + strict-audit + maintenance jobs. |

## Delta Update (2026-03-03 09:50 UTC)

| Check | Result | Evidence |
|---|---|---|
| Daily searcher sync automation (1/day) | PASS | `searcher-daily-sync.sh/js` added + cron (`40 3 * * *`). |
| Daily sync smoke run | PASS | Produced `config/openflow/subagent/daily-sync-latest.json` and markdown diff report. |
| GUI dashboard service | PASS | `apps/openflow-dashboard` started; health endpoint `http://127.0.0.1:18888/api/health` returns `ok:true`. |

## Delta Update (2026-03-03 09:58 UTC)

| Check | Result | Evidence |
|---|---|---|
| Dashboard public bind | PASS | Listener on `0.0.0.0:18888` confirmed via `ss`. |
| Dashboard token auth | PASS | `/api/health` returns `401` without token and `200` with token. |
| Public-IP health check | PASS | `http://31.97.233.48:18888/api/health?token=...` returned `ok:true`. |

## Delta Update (2026-03-03 10:06 UTC)

| Check | Result | Evidence |
|---|---|---|
| Searcher strict source policy added | PASS | Added `config/openflow/subagent/searcher-policy.json` with allowlist + blocked endpoints + forbidden keywords. |
| Policy checker implemented | PASS | `scripts/openflow/searcher-policy-check.js` validates catalog/report evidence + content and logs violations. |
| Policy checker smoke run | PASS | Current outputs passed (`ok:true`). |
| Daily cron hardening | PASS | Daily searcher sync now chains policy check and logs to `logs/searcher-policy.log`. |

## Notes

- Current failures are expected when account secrets are missing or invalid.
- No secrets were persisted in this report.

## Delta Update (2026-03-03 09:40 UTC)

| Check | Result | Evidence |
|---|---|---|
| Subagent controller status (`maverick/gmail_1`) | PASS | Active route confirmed as `groq / meta-llama/llama-4-maverick-17b-128e-instruct / gmail_1`; guard unlocked; healthy top candidates listed. |
| Live rate probe: `groq maverick gmail_1` | PASS | `PASS 200`; headers show remaining `974` requests and `5988` tokens (limits `1000`/`6000`). |
| Router preflight acquire-route (`needTokens=900 needRequests=1`) | PASS | `ok:true`; reservation accepted on `gmail_1`; remaining-after-reserve `requests=28`, `tokens=4200`. |
