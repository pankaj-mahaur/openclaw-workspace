#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SUMMARY="${1:-checkpoint}"
TASK_REF="${2:-active}"
PROGRESS="${3:-}"
FORCE_FLAG="${4:-}"

ARGS=(checkpoint --task "$TASK_REF" --summary "$SUMMARY")
if [[ -n "$PROGRESS" ]]; then
  ARGS+=(--progress "$PROGRESS")
fi
if [[ "$FORCE_FLAG" == "force" ]]; then
  ARGS+=(--force)
fi

"$ROOT/scripts/openflow/subagent-task-checkpoint.sh" "${ARGS[@]}"
