#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/config/openflow/subagent/keys.env"
STATE_FILE="$ROOT/config/openflow/subagent/runtime-state.json"
LOG_FILE="$ROOT/logs/subagent-tester-scheduled.log"

mkdir -p "$ROOT/logs"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') missing env file: $ENV_FILE" >> "$LOG_FILE"
  exit 0
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

ACTIVE_PROVIDER=$(node -e "const s=require('$STATE_FILE');console.log(s.active?.provider||'')")
ACTIVE_MODEL=$(node -e "const s=require('$STATE_FILE');console.log(s.active?.model||'')")
ACTIVE_ACCOUNT=$(node -e "const s=require('$STATE_FILE');console.log(s.active?.account||'')")

{
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') tester-scheduled-start"

  if [[ -n "$ACTIVE_PROVIDER" && -n "$ACTIVE_MODEL" && -n "$ACTIVE_ACCOUNT" ]]; then
    echo "active-route-check $ACTIVE_PROVIDER:$ACTIVE_MODEL:$ACTIVE_ACCOUNT"
    if "$ROOT/scripts/openflow/subagent-tester.sh" --provider "$ACTIVE_PROVIDER" --model "$ACTIVE_MODEL" --account "$ACTIVE_ACCOUNT" --probe chat; then
      echo "active-route-result=pass"
    else
      echo "active-route-result=fail"
    fi
  else
    echo "active-route-check skipped (no active route)"
  fi

  echo "running tester matrix (all enabled provider/model/account with keys)"
  "$ROOT/scripts/openflow/subagent-tester-matrix.sh"

  echo "tester-scheduled-end"
  echo
} >> "$LOG_FILE" 2>&1
