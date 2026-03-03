#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export OPENFLOW_CONFIG_PATH="$ROOT/config/openflow/subagent/master-config.json"
export OPENFLOW_STATE_PATH="$ROOT/config/openflow/subagent/runtime-state.json"
export OPENFLOW_CATALOG_PATH="$ROOT/config/openflow/subagent/free-model-catalog.json"
exec node "$ROOT/scripts/openflow/rate-probe.js" "$@"
