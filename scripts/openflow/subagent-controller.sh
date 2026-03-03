#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/config/openflow/subagent/keys.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

export OPENFLOW_CONFIG_PATH="$ROOT/config/openflow/subagent/master-config.json"
export OPENFLOW_STATE_PATH="$ROOT/config/openflow/subagent/runtime-state.json"
export OPENFLOW_CATALOG_PATH="$ROOT/config/openflow/subagent/free-model-catalog.json"
exec node "$ROOT/scripts/openflow/controller.js" "$@"
