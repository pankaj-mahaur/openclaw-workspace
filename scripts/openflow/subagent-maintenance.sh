#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_FILE="$ROOT/logs/subagent-autoswitch.log"
TASK_WRAPPER="$ROOT/scripts/openflow/subagent-task-checkpoint.sh"
ROUTER_WRAPPER="$ROOT/scripts/openflow/subagent-router.sh"

# Prune old completed/failed task snapshots (default 14 days)
"$TASK_WRAPPER" prune --keepDays 14 >/dev/null 2>&1 || true

# Prune stale rate-gate entries (keeps gate JSON lean)
"$ROUTER_WRAPPER" prune --maxAgeHours 72 >/dev/null 2>&1 || true

# Compact autoswitch log if too large
if [[ -f "$LOG_FILE" ]]; then
  SIZE=$(wc -c < "$LOG_FILE" || echo 0)
  MAX=$((2 * 1024 * 1024)) # 2 MB
  if (( SIZE > MAX )); then
    tail -n 4000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
  fi
fi
