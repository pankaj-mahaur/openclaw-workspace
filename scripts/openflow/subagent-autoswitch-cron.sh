#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/config/openflow/subagent/keys.env"
LOG_FILE="$ROOT/logs/subagent-autoswitch.log"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') missing env file: $ENV_FILE" >> "$LOG_FILE"
  exit 0
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

OUT="$($ROOT/scripts/openflow/subagent-autoswitch.sh 2>&1 || true)"

# Keep logs sparse to avoid unnecessary storage/context bloat.
if echo "$OUT" | grep -Eqi 'Switched:|Switch deferred|FAIL|ERROR|No active route|No alternate candidate|locked'; then
  {
    echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') autoswitch-event"
    echo "$OUT"
    echo
  } >> "$LOG_FILE"
fi
