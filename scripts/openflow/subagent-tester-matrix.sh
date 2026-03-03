#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/config/openflow/subagent/keys.env"
CFG_FILE="$ROOT/config/openflow/subagent/master-config.json"
STATE_FILE="$ROOT/config/openflow/subagent/runtime-state.json"
LOG_FILE="$ROOT/logs/subagent-tester-matrix.log"
TMP_JSONL="$(mktemp)"
MAX_PER_PROVIDER="${OPENFLOW_TESTER_MATRIX_MAX_PER_PROVIDER:-60}"
MAX_NVIDIA="${OPENFLOW_TESTER_MATRIX_MAX_NVIDIA:-20}"

mkdir -p "$ROOT/logs"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') missing env file: $ENV_FILE" >> "$LOG_FILE"
  rm -f "$TMP_JSONL"
  exit 0
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

mapfile -t COMBOS < <(node - "$CFG_FILE" "$STATE_FILE" "$MAX_PER_PROVIDER" "$MAX_NVIDIA" <<'NODE'
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let state = {};
try { state = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); } catch {}
const maxPerProvider = Number(process.argv[4] || 60);
const maxNvidia = Number(process.argv[5] || 20);
const active = state.active || {};

for (const p of (cfg.providers || [])) {
  if (p.enabled === false) continue;

  const genericEnv = `${String(p.id || '').toUpperCase()}_API_KEY`;
  const hasGeneric = !!process.env[genericEnv];
  const firstAccountId = (p.accounts || [])[0]?.id || null;

  const validAccounts = (p.accounts || []).filter((a) => {
    const hasSpecific = !!process.env[a.authEnv];
    const canUseGenericForThisSlot = hasGeneric && a.id === firstAccountId;
    return hasSpecific || canUseGenericForThisSlot;
  });
  if (!validAccounts.length) continue;

  let models = (p.models || [])
    .filter((m) => m.enabled !== false)
    .sort((a, b) => Number(a.priority ?? 999) - Number(b.priority ?? 999) || String(a.id).localeCompare(String(b.id)));

  const cap = String(p.id) === 'nvidia' ? maxNvidia : maxPerProvider;
  if (Number.isFinite(cap) && cap > 0 && models.length > cap) {
    const selected = models.slice(0, cap);
    const activeModelId = active.provider === p.id ? active.model : null;
    if (activeModelId) {
      const activeModel = models.find((m) => m.id === activeModelId);
      if (activeModel && !selected.some((m) => m.id === activeModel.id)) {
        selected.push(activeModel);
      }
    }
    models = selected;
  }

  for (const m of models) {
    for (const a of validAccounts) {
      console.log(`${p.id}\t${m.id}\t${a.id}`);
    }
  }
}
NODE
)

if [[ ${#COMBOS[@]} -eq 0 ]]; then
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') tester-matrix skip: no model/account combos with keys" >> "$LOG_FILE"
  rm -f "$TMP_JSONL"
  exit 0
fi

pass=0
fail=0

for row in "${COMBOS[@]}"; do
  provider="${row%%$'\t'*}"
  rest="${row#*$'\t'}"
  model="${rest%%$'\t'*}"
  account="${rest#*$'\t'}"

  out="$("$ROOT/scripts/openflow/subagent-tester.sh" --provider "$provider" --model "$model" --account "$account" --probe chat 2>&1 || true)"

  ok=false
  if echo "$out" | grep -q '^PASS '; then
    ok=true
    pass=$((pass+1))
  else
    fail=$((fail+1))
  fi

  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') $provider:$model:$account ok=$ok" >> "$LOG_FILE"
  echo "$out" | sed 's/^/  /' >> "$LOG_FILE"

  node - <<'NODE' "$TMP_JSONL" "$provider" "$model" "$account" "$ok" "$out"
const fs = require('fs');
const [file, provider, model, account, okStr, output] = process.argv.slice(2);
const row = {
  ts: new Date().toISOString(),
  provider,
  model,
  account,
  ok: okStr === 'true',
  output: String(output || '').slice(0, 4000)
};
fs.appendFileSync(file, JSON.stringify(row) + '\n');
NODE

  echo >> "$LOG_FILE"
done

# Auto-remove broken Cerebras preview models when all checked accounts fail with model-not-found style errors.
node - <<'NODE' "$TMP_JSONL" "$CFG_FILE"
const fs = require('fs');
const [jsonlPath, cfgPath] = process.argv.slice(2);
const previewSet = new Set(['qwen-3-235b-a22b-instruct-2507', 'zai-glm-4.7']);
const rows = fs.readFileSync(jsonlPath, 'utf8').trim().split(/\n+/).filter(Boolean).map((x) => JSON.parse(x));
const grouped = new Map();
for (const r of rows) {
  if (r.provider !== 'cerebras' || !previewSet.has(r.model)) continue;
  const arr = grouped.get(r.model) || [];
  arr.push(r);
  grouped.set(r.model, arr);
}
if (!grouped.size) process.exit(0);

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const cerebras = (cfg.providers || []).find((p) => p.id === 'cerebras');
if (!cerebras) process.exit(0);

let changed = false;
for (const [modelId, arr] of grouped.entries()) {
  const anyPass = arr.some((x) => x.ok);
  if (anyPass) continue;
  const allModelGone = arr.every((x) => /404|model.*not found|doesn.?t exist|unknown model|not available/i.test(x.output || ''));
  if (!allModelGone) continue;

  const before = (cerebras.models || []).length;
  cerebras.models = (cerebras.models || []).filter((m) => m.id !== modelId);
  if ((cerebras.models || []).length !== before) {
    changed = true;
    console.log(`Removed preview model from config: cerebras/${modelId}`);
  }
}

if (changed) {
  cfg.meta = cfg.meta || {};
  cfg.meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
}
NODE

{
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') tester-matrix-summary pass=$pass fail=$fail total=$((pass+fail))"
  echo
} >> "$LOG_FILE"

rm -f "$TMP_JSONL"
