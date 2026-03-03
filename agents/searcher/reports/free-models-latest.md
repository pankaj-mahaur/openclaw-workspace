# Free/Trial LLM Models — Latest

> Updated: 2026-03-03 (UTC)  
> Method: initial provider-doc sweep (official docs preferred), unknown fields left explicit.

## Cerebras latest (official docs quick-check)

| Model | Tier | RPM | TPM | RPD | TPD | Context (Free) | Max Output (Free) |
|---|---|---:|---:|---:|---:|---|---|
| `gpt-oss-120b` | Free | 30 | 64k | 14.4k | 1M | 65k | 32k |
| `llama3.1-8b` | Free | 30 | 60k | 14.4k | 1M | 8k | 8k |
| `qwen-3-235b-a22b-instruct-2507` | Free | 30 | 60k | 14.4k | 1M | 65k | 32k |
| `zai-glm-4.7` | Free | 10 | 60k | 100 | 1M | 64k | 40k |

**Notes:**
- Official docs also mention temporary free-tier reductions for `zai-glm-4.7` and `qwen-3-235b-a22b-instruct-2507` due to high demand.
- Limits are org-level and can vary; account dashboard is source of truth.

## Ranking (best → low)

| Rank | Provider | Model | Offer Type | Free Until | Reset | RPM | TPM | Token Caps (day/week/month) | API Access Path | Why this rank |
|---|---|---|---|---|---|---:|---:|---|---|---|
| 1 | Groq | `llama-3.1-8b-instant` | free-tier | null | daily + minute | 30 | 6000 | daily: 500000 / weekly: null / monthly: null | OpenAI-compatible endpoint via `https://api.groq.com/openai/v1` (Groq key) | Strong usable daily token cap + decent RPM; no stated expiry. |
| 2 | Groq | `meta-llama/llama-4-scout-17b-16e-instruct` | free-tier | null | daily + minute | 30 | 30000 | daily: 500000 / weekly: null / monthly: null | OpenAI-compatible endpoint via `https://api.groq.com/openai/v1` (Groq key) | Higher TPM than many free entries; same 500k daily cap. |
| 3 | Cohere | `Command R` (trial/eval key) | trial | null | monthly + minute | 20 | null | daily: null / weekly: null / monthly: null *(note: 1,000 API calls/month cap, not token cap)* | Cohere Chat API with trial key from dashboard (`api.cohere.com`) | Good model quality but usage capped at 1,000 calls/month. |
| 4 | GitHub Models | `xAI Grok-3-Mini` (Copilot Free tier) | free-tier | null | daily + minute | 2 | null | daily: null / weekly: null / monthly: null *(tokens/request: 4k in, 8k out)* | GitHub Models API via PAT (`models:read`) and Azure AI Inference-compatible calls | Easy free experimentation, but strict RPM/RPD on free tier. |
| 5 | Hugging Face Inference Providers | routed models (catalog-wide) | free-tier | null | monthly | null | null | daily: null / weekly: null / monthly: null *(budget cap is $0.10/month for free users)* | `https://router.huggingface.co/v1` with HF token (routed billing) | Broad model access but very small free monthly credit. |
| 6 | Google Gemini API | Gemini API (Free usage tier) | free-tier | null | unknown | null | null | daily: null / weekly: null / monthly: null | Gemini API via Google AI Studio / API key | Official free tier confirmed; public doc points to AI Studio for exact live limits, so numeric limits are unknown in this sweep. |

## Evidence links

- Groq rate limits (official): https://console.groq.com/docs/rate-limits
- Cohere key types + trial limits (official): https://docs.cohere.com/docs/rate-limits
- GitHub Models free usage + rate limits (official): https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models#rate-limits
- Hugging Face Inference Providers pricing/credits (official): https://huggingface.co/docs/inference-providers/pricing
- Gemini API tiers/rate-limit guidance (official): https://ai.google.dev/gemini-api/docs/rate-limits

## Smoke Validation (2026-03-03 09:19 UTC)

- Subagent config quality-order check passed:
  1) `meta-llama/llama-4-maverick-17b-128e-instruct`
  2) `meta-llama/llama-4-scout-17b-16e-instruct`
  3) `llama-3.3-70b-versatile`
- Groq docs limits remain compatible with current routing assumptions:
  - Maverick: 30 RPM / 6k TPM (developer/free observed constraints vary by org)
  - Scout: 30 RPM / 30k TPM

## Smoke validation (2026-03-03 09:40 UTC)

- Groq official docs re-check passed on the same source pages used earlier:
  - Rate limits: `https://console.groq.com/docs/rate-limits`
  - Supported models: `https://console.groq.com/docs/models`
- Free-tier shortlist signals remain consistent for key routing models:
  - `meta-llama/llama-4-maverick-17b-128e-instruct` (30 RPM / 6K TPM / 500K TPD)
  - `meta-llama/llama-4-scout-17b-16e-instruct` (30 RPM / 30K TPM / 500K TPD)
  - `llama-3.3-70b-versatile` (30 RPM / 12K TPM / 100K TPD)
- Subagent config quality order validation passed in `config/openflow/subagent/master-config.json`:
  - `fallbackOrder` top-3 is `Maverick -> Scout -> Llama-3.3-70B`.

## Unknowns / caveats

- Several providers expose limits dynamically per account/tier; published docs may be base/default values.
- Cohere documents monthly request cap for trial keys, but not token/month caps per model.
- GitHub Models free quotas vary by account tier (Copilot Free/Pro/Business/Enterprise); ranking used Copilot Free where applicable.
- Gemini doc confirms Free tier but does not publish a stable static table of exact per-model limits in the scraped page; requires checking AI Studio quota UI for current numbers.

## Daily Sync Snapshot (2026-03-03)

- Provider: groq
- Active models: 20
- Added: 0
- Removed: 0
- Limits changed: 0

- Provider: groq
- Active models: 20
- Added: 0
- Removed: 0
- Limits changed: 0

- Active models: 20
- Added: 0
- Removed: 0
- Limits changed: 0

- Active models: 20
- Added: 0
- Removed: 0
- Limits changed: 0

- Active models: 24
- Added: 0
- Removed: 0
- Limits changed: 0

- Active models: 24
- Added: 0
- Removed: 0
- Limits changed: 0

- Active models: 20
- Added: 17
- Removed: 0
- Limits changed: 0
