#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="$ROOT/config/openflow/subagent/runtime-state.json"

ACTIVE_PROVIDER=$(node -e "const s=require('$STATE');console.log(s.active?.provider||'')")
ACTIVE_MODEL=$(node -e "const s=require('$STATE');console.log(s.active?.model||'')")
ACTIVE_ACCOUNT=$(node -e "const s=require('$STATE');console.log(s.active?.account||'')")

if [[ -z "$ACTIVE_PROVIDER" || -z "$ACTIVE_MODEL" || -z "$ACTIVE_ACCOUNT" ]]; then
  echo "No active route in subagent runtime state."
  exit 2
fi

"$ROOT/scripts/openflow/subagent-rate-probe.sh" \
  --provider "$ACTIVE_PROVIDER" \
  --model "$ACTIVE_MODEL" \
  --account "$ACTIVE_ACCOUNT"

"$ROOT/scripts/openflow/subagent-controller.sh" maybe-switch \
  "$ACTIVE_PROVIDER" "$ACTIVE_MODEL" "$ACTIVE_ACCOUNT"
