#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_FILE="$ROOT/logs/subagent-strict-audit.log"

# Allowlisted command fragments (safe/gated paths)
ALLOW_PATTERNS=(
  "subagent-safe-chat"
  "subagent-router"
  "subagent-rate-probe"
  "subagent-tester"
  "router.js"
  "rate-probe.js"
  "tester.js"
)

# Provider API domains to protect from ungated direct CLI usage
TARGET_DOMAINS=(
  "api.groq.com"
  "api.cerebras.ai"
  "api.openai.com"
)

now="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
violations=0

while read -r pid cmd; do
  [[ -z "${pid:-}" ]] && continue
  [[ -z "${cmd:-}" ]] && continue

  hit_domain=0
  for d in "${TARGET_DOMAINS[@]}"; do
    if [[ "$cmd" == *"$d"* ]]; then
      hit_domain=1
      break
    fi
  done
  [[ "$hit_domain" -eq 0 ]] && continue

  allow=0
  for p in "${ALLOW_PATTERNS[@]}"; do
    if [[ "$cmd" == *"$p"* ]]; then
      allow=1
      break
    fi
  done

  if [[ "$allow" -eq 0 ]]; then
    kill -TERM "$pid" 2>/dev/null || true
    echo "$now strict-kill pid=$pid cmd=$cmd" >> "$LOG_FILE"
    violations=$((violations+1))
  fi
done < <(ps -eo pid=,args=)

if [[ "$violations" -gt 0 ]]; then
  echo "$now strict-summary killed=$violations" >> "$LOG_FILE"
fi
