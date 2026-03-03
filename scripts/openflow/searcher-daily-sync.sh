#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/config/openflow/subagent/keys.env"
export OPENFLOW_CONFIG_PATH="$ROOT/config/openflow/subagent/master-config.json"
export OPENFLOW_CATALOG_PATH="$ROOT/config/openflow/subagent/free-model-catalog.json"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

exec node "$ROOT/scripts/openflow/searcher-daily-sync.js" "$@"
