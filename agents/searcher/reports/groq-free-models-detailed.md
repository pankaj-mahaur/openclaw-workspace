# Groq Free Models — Detailed (Live + Docs)

Updated: 2026-03-03 UTC

Data sources:
- Live account model list: `GET https://api.groq.com/openai/v1/models`
- Free-tier limits: https://console.groq.com/docs/rate-limits

> Note: limits are org-level and can vary by account/plan. `freeUntil` is not published as a fixed date by Groq docs.

## A) Live active models on current key (20)

allam-2-7b
canopylabs/orpheus-arabic-saudi
canopylabs/orpheus-v1-english
groq/compound
groq/compound-mini
llama-3.1-8b-instant
llama-3.3-70b-versatile
meta-llama/llama-4-maverick-17b-128e-instruct
meta-llama/llama-4-scout-17b-16e-instruct
meta-llama/llama-guard-4-12b
meta-llama/llama-prompt-guard-2-22m
meta-llama/llama-prompt-guard-2-86m
moonshotai/kimi-k2-instruct
moonshotai/kimi-k2-instruct-0905
openai/gpt-oss-120b
openai/gpt-oss-20b
openai/gpt-oss-safeguard-20b
qwen/qwen3-32b
whisper-large-v3
whisper-large-v3-turbo

## B) Free-tier limits + routing decision

| Model | RPM | RPD | TPM | TPD | ASH | ASD | Type | Routing Decision |
|---|---:|---:|---:|---:|---:|---:|---|---|
| meta-llama/llama-4-scout-17b-16e-instruct | 30 | 1K | 30K | 500K | - | - | General LLM | KEEP |
| meta-llama/llama-4-maverick-17b-128e-instruct | 30 | 1K | 6K | 500K | - | - | General LLM | KEEP |
| llama-3.3-70b-versatile | 30 | 1K | 12K | 100K | - | - | General LLM | KEEP |
| moonshotai/kimi-k2-instruct-0905 | 60 | 1K | 10K | 300K | - | - | General LLM | KEEP |
| openai/gpt-oss-120b | 30 | 1K | 8K | 200K | - | - | General LLM | KEEP |
| qwen/qwen3-32b | 60 | 1K | 6K | 500K | - | - | General LLM | KEEP |
| moonshotai/kimi-k2-instruct | 60 | 1K | 10K | 300K | - | - | General LLM | DROP (duplicate family) |
| openai/gpt-oss-20b | 30 | 1K | 8K | 200K | - | - | General LLM | DROP (weaker vs 120b) |
| llama-3.1-8b-instant | 30 | 14.4K | 6K | 500K | - | - | Small LLM | DROP (quality-first policy) |
| groq/compound | 30 | 250 | 70K | - | - | - | System model | DROP (specialized orchestration) |
| groq/compound-mini | 30 | 250 | 70K | - | - | - | System model | DROP (specialized orchestration) |
| allam-2-7b | 30 | 7K | 6K | 500K | - | - | Small LLM | DROP |
| meta-llama/llama-guard-4-12b | 30 | 14.4K | 15K | 500K | - | - | Safety/Guardrail | DROP |
| meta-llama/llama-prompt-guard-2-22m | 30 | 14.4K | 15K | 500K | - | - | Safety/Guardrail | DROP |
| meta-llama/llama-prompt-guard-2-86m | 30 | 14.4K | 15K | 500K | - | - | Safety/Guardrail | DROP |
| openai/gpt-oss-safeguard-20b | 30 | 1K | 8K | 200K | - | - | Safety/Guardrail | DROP |
| canopylabs/orpheus-arabic-saudi | 10 | 100 | 1.2K | 3.6K | - | - | TTS/voice | DROP |
| canopylabs/orpheus-v1-english | 10 | 100 | 1.2K | 3.6K | - | - | TTS/voice | DROP |
| whisper-large-v3 | 20 | 2K | - | - | 7.2K | 28.8K | ASR/audio | DROP |
| whisper-large-v3-turbo | 20 | 2K | - | - | 7.2K | 28.8K | ASR/audio | DROP |

## C) OpenClaw routing shortlist now enforced

1. meta-llama/llama-4-scout-17b-16e-instruct
2. meta-llama/llama-4-maverick-17b-128e-instruct
3. llama-3.3-70b-versatile
4. moonshotai/kimi-k2-instruct-0905
5. openai/gpt-oss-120b
6. qwen/qwen3-32b

Weak/specialized models are excluded from default routing.
