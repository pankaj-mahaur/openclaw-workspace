#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SUMMARY="${1:-checkpoint}"
TASK_REF="${2:-active}"
PROGRESS="${3:-}"

# Milestone-based autosave policy (token/context efficient):
# - checkpoint roughly every 20-30 min
# - or >=10-15% progress jump
# - always allow major milestone summaries to pass
export OPENFLOW_CHECKPOINT_MIN_INTERVAL_SEC="${OPENFLOW_CHECKPOINT_MIN_INTERVAL_SEC:-1500}"
export OPENFLOW_CHECKPOINT_PROGRESS_MIN_DELTA="${OPENFLOW_CHECKPOINT_PROGRESS_MIN_DELTA:-12}"
export OPENFLOW_CHECKPOINT_SUMMARY_MAX="${OPENFLOW_CHECKPOINT_SUMMARY_MAX:-220}"
export OPENFLOW_CHECKPOINT_MAX_PER_TASK="${OPENFLOW_CHECKPOINT_MAX_PER_TASK:-30}"
export OPENFLOW_CHECKPOINT_MILESTONE_REGEX="${OPENFLOW_CHECKPOINT_MILESTONE_REGEX:-(milestone|phase|completed|done|final|handoff|integrated|validated|shipped|report ready|checkpoint)}"

if [[ -n "$PROGRESS" ]]; then
  "$ROOT/scripts/openflow/subagent-task-checkpoint.sh" checkpoint --task "$TASK_REF" --summary "$SUMMARY" --progress "$PROGRESS"
else
  "$ROOT/scripts/openflow/subagent-task-checkpoint.sh" checkpoint --task "$TASK_REF" --summary "$SUMMARY"
fi
