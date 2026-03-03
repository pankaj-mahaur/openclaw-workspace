#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG_PATH = process.env.OPENFLOW_CONFIG_PATH || path.join(ROOT, 'config/openflow/subagent/master-config.json');
const CATALOG_PATH = process.env.OPENFLOW_CATALOG_PATH || path.join(ROOT, 'config/openflow/subagent/free-model-catalog.json');
const DAILY_JSON = path.join(ROOT, 'config/openflow/subagent/daily-sync-latest.json');
const DAILY_MD = path.join(ROOT, 'agents/searcher/reports/daily-sync-latest.md');
const SEARCHER_MD = path.join(ROOT, 'agents/searcher/reports/free-models-latest.md');

function nowIso() { return new Date().toISOString(); }
function todayUtc() { return new Date().toISOString().slice(0, 10); }
function readJson(p, fallback = null) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
function writeJson(p, obj) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); }
function toNum(v) { return v == null ? null : Number(v); }

const GROQ_LIMITS = {
  'allam-2-7b': { rpm: 30, rpd: 7000, tpm: 6000, dailyTokens: 500000 },
  'canopylabs/orpheus-arabic-saudi': { rpm: 10, rpd: 100, tpm: 1200, dailyTokens: 3600 },
  'canopylabs/orpheus-v1-english': { rpm: 10, rpd: 100, tpm: 1200, dailyTokens: 3600 },
  'groq/compound': { rpm: 30, rpd: 250, tpm: 70000, dailyTokens: null },
  'groq/compound-mini': { rpm: 30, rpd: 250, tpm: 70000, dailyTokens: null },
  'llama-3.1-8b-instant': { rpm: 30, rpd: 14400, tpm: 6000, dailyTokens: 500000 },
  'llama-3.3-70b-versatile': { rpm: 30, rpd: 1000, tpm: 12000, dailyTokens: 100000 },
  'meta-llama/llama-4-maverick-17b-128e-instruct': { rpm: 30, rpd: 1000, tpm: 6000, dailyTokens: 500000 },
  'meta-llama/llama-4-scout-17b-16e-instruct': { rpm: 30, rpd: 1000, tpm: 30000, dailyTokens: 500000 },
  'meta-llama/llama-guard-4-12b': { rpm: 30, rpd: 14400, tpm: 15000, dailyTokens: 500000 },
  'meta-llama/llama-prompt-guard-2-22m': { rpm: 30, rpd: 14400, tpm: 15000, dailyTokens: 500000 },
  'meta-llama/llama-prompt-guard-2-86m': { rpm: 30, rpd: 14400, tpm: 15000, dailyTokens: 500000 },
  'moonshotai/kimi-k2-instruct': { rpm: 60, rpd: 1000, tpm: 10000, dailyTokens: 300000 },
  'moonshotai/kimi-k2-instruct-0905': { rpm: 60, rpd: 1000, tpm: 10000, dailyTokens: 300000 },
  'openai/gpt-oss-120b': { rpm: 30, rpd: 1000, tpm: 8000, dailyTokens: 200000 },
  'openai/gpt-oss-20b': { rpm: 30, rpd: 1000, tpm: 8000, dailyTokens: 200000 },
  'openai/gpt-oss-safeguard-20b': { rpm: 30, rpd: 1000, tpm: 8000, dailyTokens: 200000 },
  'qwen/qwen3-32b': { rpm: 60, rpd: 1000, tpm: 6000, dailyTokens: 500000 },
  'whisper-large-v3': { rpm: 20, rpd: 2000, tpm: null, dailyTokens: null },
  'whisper-large-v3-turbo': { rpm: 20, rpd: 2000, tpm: null, dailyTokens: null }
};

const QUALITY_RANK = {
  'meta-llama/llama-4-maverick-17b-128e-instruct': 9.4,
  'meta-llama/llama-4-scout-17b-16e-instruct': 8.8,
  'llama-3.3-70b-versatile': 8.6,
  'moonshotai/kimi-k2-instruct-0905': 8.4,
  'openai/gpt-oss-120b': 8.2,
  'qwen/qwen3-32b': 8.0
};

function getProvider(cfg, providerId) {
  return (cfg.providers || []).find((p) => p.id === providerId) || null;
}

function pickProviderApiKey(provider) {
  for (const a of provider.accounts || []) {
    if (process.env[a.authEnv]) return process.env[a.authEnv];
  }
  const genericEnv = `${String(provider.id || '').toUpperCase()}_API_KEY`;
  return process.env[genericEnv] || null;
}

async function fetchOpenAICompatibleModels(baseUrl, apiKey) {
  const res = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`/models failed ${res.status}: ${txt.slice(0, 240)}`);
  const body = JSON.parse(txt);
  return (body.data || []).filter((m) => m.active !== false).map((m) => m.id).sort();
}

function buildGroqItem(id, previous) {
  const lim = GROQ_LIMITS[id] || {};
  return {
    provider: 'Groq',
    model: id,
    offerType: 'free-tier',
    freeUntil: null,
    resetCadence: 'daily+minute',
    limits: {
      rpm: toNum(lim.rpm) ?? null,
      tpm: toNum(lim.tpm) ?? null,
      rpd: toNum(lim.rpd) ?? null,
      dailyTokens: toNum(lim.dailyTokens) ?? null,
      weeklyTokens: null,
      monthlyTokens: null
    },
    apiAccess: 'OpenAI-compatible endpoint https://api.groq.com/openai/v1 with Groq API key',
    evidence: [
      { title: 'Groq Docs - Rate Limits', url: 'https://console.groq.com/docs/rate-limits' },
      { title: 'Groq Docs - Models', url: 'https://console.groq.com/docs/models' }
    ],
    rankScore: QUALITY_RANK[id] ?? previous?.rankScore ?? 6.5,
    syncMeta: {
      source: 'daily-sync',
      unknownLimit: !(id in GROQ_LIMITS),
      preview: false
    }
  };
}

function summarizeDiff(prevItems, nextItems) {
  const p = new Map(prevItems.map((x) => [x.model, x]));
  const n = new Map(nextItems.map((x) => [x.model, x]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const m of n.keys()) {
    if (!p.has(m)) {
      added.push(`groq:${m}`);
      continue;
    }
    const a = p.get(m).limits || {};
    const b = n.get(m).limits || {};
    if (a.rpm !== b.rpm || a.tpm !== b.tpm || a.rpd !== b.rpd || a.dailyTokens !== b.dailyTokens) {
      changed.push({ model: `groq:${m}`, before: a, after: b });
    }
  }

  for (const m of p.keys()) {
    if (!n.has(m)) removed.push(`groq:${m}`);
  }

  return { added, removed, changed };
}

function patchGroqConfig(cfg, activeModels, nextItems) {
  const provider = getProvider(cfg, 'groq');
  if (!provider) return false;

  let changed = false;
  provider.models = provider.models || [];
  const existingByModel = new Map(provider.models.map((m) => [m.id, m]));
  const byModel = new Map(nextItems.map((x) => [x.model, x]));
  let maxPriority = provider.models.reduce((m, x) => Math.max(m, Number(x.priority || 0)), 0);

  // auto-add newly discovered Groq models
  for (const modelId of activeModels) {
    if (existingByModel.has(modelId)) continue;
    maxPriority += 1;
    provider.models.push({
      id: modelId,
      displayName: `Groq ${modelId}`,
      enabled: true,
      priority: maxPriority,
      freeWindow: { type: 'free-tier', freeUntil: null, resetCadence: 'daily+minute' },
      limits: {
        rpm: byModel.get(modelId)?.limits?.rpm ?? null,
        tpm: byModel.get(modelId)?.limits?.tpm ?? null,
        dailyTokens: byModel.get(modelId)?.limits?.dailyTokens ?? null,
        weeklyTokens: null
      },
      notes: 'Auto-added from Groq /models.'
    });
    changed = true;
  }

  // update known limits
  for (const m of provider.models) {
    const it = byModel.get(m.id);
    if (!it) continue;
    const nextLimits = {
      rpm: it.limits?.rpm ?? null,
      tpm: it.limits?.tpm ?? null,
      dailyTokens: it.limits?.dailyTokens ?? null,
      weeklyTokens: null
    };
    const prev = m.limits || {};
    if (prev.rpm !== nextLimits.rpm || prev.tpm !== nextLimits.tpm || prev.dailyTokens !== nextLimits.dailyTokens || prev.weeklyTokens !== nextLimits.weeklyTokens) {
      m.limits = nextLimits;
      changed = true;
    }
  }

  if (changed) {
    cfg.meta = cfg.meta || {};
    cfg.meta.updatedAt = nowIso();
  }
  return changed;
}

function writeReports(aggregate) {
  const lines = [];
  lines.push(`# Groq Daily Sync — ${todayUtc()}`);
  lines.push('');
  lines.push(`- Active models found: **${aggregate.activeModelCount}**`);
  lines.push(`- Added: **${aggregate.diff.added.length}**`);
  lines.push(`- Removed: **${aggregate.diff.removed.length}**`);
  lines.push(`- Limits changed: **${aggregate.diff.changed.length}**`);
  lines.push('');
  lines.push('## Added');
  lines.push(aggregate.diff.added.length ? aggregate.diff.added.map((x) => `- ${x}`).join('\n') : '- None');
  lines.push('');
  lines.push('## Removed');
  lines.push(aggregate.diff.removed.length ? aggregate.diff.removed.map((x) => `- ${x}`).join('\n') : '- None');
  lines.push('');
  lines.push('## Limit Changes');
  if (!aggregate.diff.changed.length) lines.push('- None');
  else aggregate.diff.changed.forEach((c) => lines.push(`- ${c.model}: rpm ${c.before.rpm ?? 'null'} -> ${c.after.rpm ?? 'null'}, tpm ${c.before.tpm ?? 'null'} -> ${c.after.tpm ?? 'null'}, rpd ${c.before.rpd ?? 'null'} -> ${c.after.rpd ?? 'null'}, tpd ${c.before.dailyTokens ?? 'null'} -> ${c.after.dailyTokens ?? 'null'}`));
  lines.push('');
  lines.push('Rate limits are org-level; runtime headers remain source of truth.');

  fs.mkdirSync(path.dirname(DAILY_MD), { recursive: true });
  fs.writeFileSync(DAILY_MD, lines.join('\n') + '\n');

  const stamp = `## Daily Sync Snapshot (${todayUtc()})`;
  let base = fs.existsSync(SEARCHER_MD) ? fs.readFileSync(SEARCHER_MD, 'utf8') : '# Free/Trial LLM Models — Latest\n\n';
  const re = new RegExp(`## Daily Sync Snapshot \\(${todayUtc()}\\)[\\s\\S]*?(?=\\n## |$)`, 'm');
  const block = `${stamp}\n\n- Provider: groq\n- Active models: ${aggregate.activeModelCount}\n- Added: ${aggregate.diff.added.length}\n- Removed: ${aggregate.diff.removed.length}\n- Limits changed: ${aggregate.diff.changed.length}\n`;
  if (re.test(base)) base = base.replace(re, block.trimEnd());
  else base += `\n${block}`;
  fs.writeFileSync(SEARCHER_MD, base);
}

async function main() {
  const cfg = readJson(CFG_PATH, null);
  if (!cfg) throw new Error(`Missing config: ${CFG_PATH}`);
  const catalog = readJson(CATALOG_PATH, { updatedAt: null, source: 'searcher-agent', items: [] });

  const provider = getProvider(cfg, 'groq');
  if (!provider || provider.enabled === false) throw new Error('groq provider missing/disabled');

  const key = pickProviderApiKey(provider);
  if (!key) throw new Error('no Groq key found in env');

  const activeModels = await fetchOpenAICompatibleModels(provider.baseUrl, key);
  const prevItems = (catalog.items || []).filter((x) => String(x.provider || '').toLowerCase() === 'groq');
  const prevByModel = new Map(prevItems.map((x) => [x.model, x]));
  const nextItems = activeModels.map((id) => buildGroqItem(id, prevByModel.get(id)));
  const diff = summarizeDiff(prevItems, nextItems);

  const nonGroqItems = (catalog.items || []).filter((x) => String(x.provider || '').toLowerCase() !== 'groq');
  catalog.items = [...nonGroqItems, ...nextItems]
    .sort((a, b) => `${a.provider}:${a.model}`.localeCompare(`${b.provider}:${b.model}`));
  catalog.updatedAt = nowIso();
  writeJson(CATALOG_PATH, catalog);

  const configPatched = patchGroqConfig(cfg, activeModels, nextItems);
  if (configPatched) writeJson(CFG_PATH, cfg);

  const aggregate = {
    ok: true,
    updatedAt: nowIso(),
    provider: 'groq',
    activeModelCount: activeModels.length,
    diff,
    activeModels: activeModels.map((m) => `groq:${m}`),
    providers: {
      groq: {
        skipped: false,
        reason: null,
        activeModelCount: activeModels.length,
        diff,
        activeModels
      }
    },
    configPatched
  };

  writeJson(DAILY_JSON, aggregate);
  writeReports(aggregate);

  console.log(JSON.stringify(aggregate, null, 2));
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
