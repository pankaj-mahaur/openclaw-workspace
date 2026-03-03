#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MINUTES="${1:-90}"
TASK_NAME="${2:-subagent-task}"
NOTE="${3:-}"

if [[ -n "$NOTE" ]]; then
  "$ROOT/scripts/openflow/subagent-task-checkpoint.sh" start --name "$TASK_NAME" --lockMinutes "$MINUTES" --note "$NOTE"
else
  "$ROOT/scripts/openflow/subagent-task-checkpoint.sh" start --name "$TASK_NAME" --lockMinutes "$MINUTES"
fi
