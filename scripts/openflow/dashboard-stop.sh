#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PID_FILE="$ROOT/apps/openflow-dashboard/dashboard.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Dashboard not running"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID" || true
  sleep 1
fi
rm -f "$PID_FILE"
echo "Dashboard stopped"
