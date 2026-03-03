#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PID_FILE="$ROOT/apps/openflow-dashboard/dashboard.pid"
LOG_FILE="$ROOT/logs/openflow-dashboard.log"
ENV_FILE="$ROOT/config/openflow/subagent/dashboard.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

HOST="${OPENFLOW_DASHBOARD_HOST:-127.0.0.1}"
PORT="${OPENFLOW_DASHBOARD_PORT:-18888}"
TOKEN="${OPENFLOW_DASHBOARD_TOKEN:-}"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Dashboard already running (pid $(cat "$PID_FILE"))"
  exit 0
fi

mkdir -p "$ROOT/logs"
nohup env OPENFLOW_DASHBOARD_HOST="$HOST" OPENFLOW_DASHBOARD_PORT="$PORT" OPENFLOW_DASHBOARD_TOKEN="$TOKEN" node "$ROOT/apps/openflow-dashboard/server.js" >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

if [[ -n "$TOKEN" ]]; then
  echo "Dashboard started: http://$HOST:$PORT/?token=$TOKEN (pid $(cat "$PID_FILE"))"
else
  echo "Dashboard started: http://$HOST:$PORT (pid $(cat "$PID_FILE"))"
fi
