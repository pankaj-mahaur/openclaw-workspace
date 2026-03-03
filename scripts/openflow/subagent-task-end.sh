#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/config/openflow/subagent/keys.env"
SUMMARY="${1:-Task completed}"
TASK_REF="${2:-active}"

if "$ROOT/scripts/openflow/subagent-task-checkpoint.sh" complete --task "$TASK_REF" --summary "$SUMMARY" >/dev/null 2>&1; then
  echo "Task marked complete: $TASK_REF"
else
  # fallback: ensure guard is at least unlocked
  "$ROOT/scripts/openflow/subagent-controller.sh" unlock || true
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  "$ROOT/scripts/openflow/subagent-autoswitch.sh" || true
fi
