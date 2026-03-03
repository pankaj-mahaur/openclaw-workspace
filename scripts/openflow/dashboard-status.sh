#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PID_FILE="$ROOT/apps/openflow-dashboard/dashboard.pid"
ENV_FILE="$ROOT/config/openflow/subagent/dashboard.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

HOST="${OPENFLOW_DASHBOARD_HOST:-127.0.0.1}"
PORT="${OPENFLOW_DASHBOARD_PORT:-18888}"
TOKEN="${OPENFLOW_DASHBOARD_TOKEN:-}"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  if [[ -n "$TOKEN" ]]; then
    echo "running pid=$(cat "$PID_FILE") url=http://$HOST:$PORT/?token=$TOKEN"
  else
    echo "running pid=$(cat "$PID_FILE") url=http://$HOST:$PORT"
  fi
else
  echo "stopped"
fi
