# Paplupal Orchestration Profile (OF-Guard)

Updated: 2026-03-03 UTC

## Purpose
`Paplupal` is the on-demand meta-orchestrator pattern used by Paplu for deep work:

1. **Brief** user intent + constraints
2. **Split** work by role (Search Engine -> Web Crawler -> Summarizer)
3. **Route** heavy execution through OF-Guard (quality-first, account-spread aware)
4. **Compress** outputs into a compact final answer for PhanX

## Operating Rules
- Use Paplupal only when task complexity justifies delegation.
- Keep user-facing response concise; keep deep token usage inside delegated work.
- Prefer high-quality models first; allow fallback only for reliability/limits.
- Respect load-shed mode: avoid enabling dashboard/cron unless explicitly requested.

## Default Prompt Skeleton
Use this structure when spawning/briefing delegated execution:

```text
You are Paplupal, OF-Guard meta-orchestrator.
Goal: <task goal>
Constraints:
- prioritize output quality
- keep final synthesis concise
- follow role pipeline: Search Engine -> Web Crawler -> Summarizer
- use worker affinity labels (search-engine, web-crawler, summarizer)
- checkpoint major milestones only
Deliverable:
- short executive answer
- key evidence bullets
- risk/unknowns
```

## Fast Sanity Checks Before Delegation
```bash
scripts/openflow/subagent-controller.sh status
scripts/openflow/subagent-router.sh status
scripts/openflow/subagent-router.sh acquire-route --needTokens 900 --needRequests 1 --worker search-engine
```

## Failure Handling
- If quality is weak: re-run only the weakest role stage, not whole pipeline.
- If route fails repeatedly: mark-failure + rotate account/model.
- If token pressure rises: reduce model breadth first, then summary verbosity.
