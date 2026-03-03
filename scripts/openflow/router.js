#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG_PATH = process.env.OPENFLOW_CONFIG_PATH || path.join(ROOT, 'config/openflow/master-config.json');
const STATE_PATH = process.env.OPENFLOW_STATE_PATH || path.join(ROOT, 'config/openflow/runtime-state.json');
const CATALOG_PATH = process.env.OPENFLOW_CATALOG_PATH || path.join(ROOT, 'config/openflow/free-model-catalog.json');
const GATE_PATH = process.env.OPENFLOW_GATE_PATH || path.join(path.dirname(STATE_PATH), 'rate-gate-state.json');

function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function toNum(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function minPositive(a, b) {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function getCatalogScore(catalog, providerId, modelId) {
  const p = String(providerId || '').toLowerCase();
  const item = (catalog.items || []).find((x) => String(x.provider || '').toLowerCase() === p && String(x.model || '') === String(modelId || ''));
  return Number(item?.rankScore || 0);
}

function getDynamicLimitsFromHealth(state, key) {
  const rl = state.health?.[key]?.rateLimit || {};
  return {
    rpm: toNum(rl['x-ratelimit-limit-requests-minute']) ?? toNum(rl['x-ratelimit-limit-requests']) ?? null,
    tpm: toNum(rl['x-ratelimit-limit-tokens-minute']) ?? toNum(rl['x-ratelimit-limit-tokens']) ?? null
  };
}

function resolveLimits(model, dynamicLimits) {
  const staticRpm = toNum(model?.limits?.rpm);
  const staticTpm = toNum(model?.limits?.tpm);
  const rpm = minPositive(staticRpm, dynamicLimits?.rpm ?? null);
  const tpm = minPositive(staticTpm, dynamicLimits?.tpm ?? null);
  return { rpm, tpm };
}

function listCandidates(cfg, state, catalog) {
  const out = [];

  for (const p of cfg.providers || []) {
    if (!p.enabled) continue;
    for (const m of p.models || []) {
      if (m.enabled === false) continue;
      for (const a of p.accounts || []) {
        const authEnv = a.authEnv;
        const hasKey = !!process.env[authEnv];
        if (!hasKey) continue;

        const key = `${p.id}:${m.id}:${a.id}`;
        const h = state.health?.[key] || {};
        if (h.ok === false) continue;

        const priorityScore = Math.max(0, 100 - ((m.priority || 100) * 5));
        const catalogScore = getCatalogScore(catalog, p.id, m.id);

        out.push({
          provider: p.id,
          model: m.id,
          account: a.id,
          authEnv,
          score: priorityScore + catalogScore,
          providerObj: p,
          modelObj: m,
          healthKey: key
        });
      }
    }
  }

  return out.sort((x, y) => y.score - x.score);
}

function loadGate() {
  return readJson(GATE_PATH, { updatedAt: null, entries: {} });
}

function saveGate(gate) {
  gate.updatedAt = nowIso();
  writeJson(GATE_PATH, gate);
}

function getGateEntry(gate, key, limits, windowSec = 60) {
  gate.entries = gate.entries || {};
  const now = Date.now();
  const e = gate.entries[key] || {
    windowStartMs: now,
    windowSec,
    rpmLimit: limits.rpm,
    tpmLimit: limits.tpm,
    usedRequests: 0,
    usedTokens: 0,
    updatedAt: nowIso()
  };

  const expired = (now - e.windowStartMs) >= (e.windowSec * 1000);
  if (expired) {
    e.windowStartMs = now;
    e.usedRequests = 0;
    e.usedTokens = 0;
  }

  e.windowSec = windowSec;
  e.rpmLimit = limits.rpm;
  e.tpmLimit = limits.tpm;
  e.updatedAt = nowIso();

  gate.entries[key] = e;
  return e;
}

function tryAcquire(gate, key, limits, needReq = 1, needTok = 0, windowSec = 60) {
  const e = getGateEntry(gate, key, limits, windowSec);
  const now = Date.now();

  const reqLimit = limits.rpm == null ? Infinity : limits.rpm;
  const tokLimit = limits.tpm == null ? Infinity : limits.tpm;

  const remReq = reqLimit - e.usedRequests;
  const remTok = tokLimit - e.usedTokens;

  const ok = remReq >= needReq && remTok >= needTok;
  if (ok) {
    e.usedRequests += needReq;
    e.usedTokens += needTok;
    e.updatedAt = nowIso();
  }

  const retryAfterSec = Math.max(1, Math.ceil(((e.windowStartMs + e.windowSec * 1000) - now) / 1000));

  return {
    ok,
    remaining: {
      requests: Math.max(0, remReq),
      tokens: Math.max(0, remTok)
    },
    retryAfterSec
  };
}

function usagePct(entry, limits) {
  if (!entry) return 0;
  const reqPct = limits?.rpm ? ((entry.usedRequests || 0) / limits.rpm) * 100 : 0;
  const tokPct = limits?.tpm ? ((entry.usedTokens || 0) / limits.tpm) * 100 : 0;
  return Math.max(0, reqPct, tokPct);
}

function rankCandidatesForAcquire(candidates, state, gate, windowSec, workerTag = null) {
  const allocator = state.routeAllocator || {};
  const lastByModel = allocator.lastAssignedByProviderModel || {};
  const workerAffinity = allocator.workerAffinity || {};
  const active = state.active || {};

  const routesUsedByOtherWorkers = new Set(
    Object.entries(workerAffinity)
      .filter(([w]) => !workerTag || w !== workerTag)
      .map(([, routeKey]) => routeKey)
      .filter(Boolean)
  );

  const ranked = [];
  for (const c of candidates) {
    const dynamic = getDynamicLimitsFromHealth(state, c.healthKey);
    const limits = resolveLimits(c.modelObj, dynamic);
    const routeKey = `${c.provider}:${c.model}:${c.account}`;
    const modelKey = `${c.provider}:${c.model}`;
    const e = getGateEntry(gate, routeKey, limits, windowSec);
    const util = usagePct(e, limits);

    const sameAsActive = active.provider === c.provider && active.model === c.model && active.account === c.account;
    const sameAsLastForModel = lastByModel[modelKey] === c.account;
    const usedByOtherWorker = routesUsedByOtherWorkers.has(routeKey);
    const affinityBoost = workerTag && workerAffinity[workerTag] === routeKey ? 10 : 0;

    // keep quality-first score, then penalize hot/sticky routes to spread work across accounts
    const adjustedScore = c.score + affinityBoost
      - (util * 0.6)
      - (sameAsLastForModel ? 12 : 0)
      - (sameAsActive ? 3 : 0)
      - (usedByOtherWorker ? 15 : 0);

    ranked.push({
      candidate: c,
      limits,
      routeKey,
      modelKey,
      utilization: util,
      adjustedScore
    });
  }

  ranked.sort((a, b) => {
    if (b.adjustedScore !== a.adjustedScore) return b.adjustedScore - a.adjustedScore;
    if (a.utilization !== b.utilization) return a.utilization - b.utilization;
    return b.candidate.score - a.candidate.score;
  });

  return ranked;
}

function commandAcquireRoute() {
  const needRequests = Number(arg('needRequests', '1'));
  const needTokens = Number(arg('needTokens', '0'));
  const windowSec = Number(arg('windowSec', '60'));
  const worker = arg('worker', null);

  if (!Number.isFinite(needRequests) || needRequests <= 0) throw new Error('needRequests must be > 0');
  if (!Number.isFinite(needTokens) || needTokens < 0) throw new Error('needTokens must be >= 0');
  if (!Number.isFinite(windowSec) || windowSec <= 0) throw new Error('windowSec must be > 0');

  const cfg = readJson(CFG_PATH);
  const state = readJson(STATE_PATH);
  const catalog = readJson(CATALOG_PATH, { items: [] });
  const gate = loadGate();

  const candidates = listCandidates(cfg, state, catalog);
  if (!candidates.length) {
    console.log(JSON.stringify({ ok: false, reason: 'no_candidates' }, null, 2));
    process.exit(1);
  }

  const ranked = rankCandidatesForAcquire(candidates, state, gate, windowSec, worker);

  let bestRetry = null;
  for (const entry of ranked) {
    const c = entry.candidate;
    const limits = entry.limits;
    const key = entry.routeKey;

    const gateResult = tryAcquire(gate, key, limits, needRequests, needTokens, windowSec);
    if (gateResult.ok) {
      state.active = { provider: c.provider, model: c.model, account: c.account };
      state.routeAllocator = state.routeAllocator || {};
      state.routeAllocator.lastAssignedByProviderModel = state.routeAllocator.lastAssignedByProviderModel || {};
      state.routeAllocator.lastAssignedByProviderModel[entry.modelKey] = c.account;
      state.routeAllocator.lastAssignedKey = key;
      state.routeAllocator.lastAssignedAt = nowIso();
      if (worker) {
        state.routeAllocator.workerAffinity = state.routeAllocator.workerAffinity || {};
        state.routeAllocator.workerAffinity[worker] = key;
      }
      state.updatedAt = nowIso();
      writeJson(STATE_PATH, state);
      saveGate(gate);

      console.log(JSON.stringify({
        ok: true,
        route: {
          provider: c.provider,
          model: c.model,
          account: c.account,
          baseUrl: c.providerObj.baseUrl,
          authEnv: c.authEnv
        },
        limits,
        reserved: { requests: needRequests, tokens: needTokens },
        selected: {
          worker: worker || null,
          adjustedScore: Number(entry.adjustedScore.toFixed(2)),
          utilizationPct: Number(entry.utilization.toFixed(2))
        },
        remainingAfterReserve: {
          requests: Math.max(0, gateResult.remaining.requests - needRequests),
          tokens: Math.max(0, gateResult.remaining.tokens - needTokens)
        }
      }, null, 2));
      return;
    }

    if (bestRetry == null || gateResult.retryAfterSec < bestRetry.retryAfterSec) {
      bestRetry = {
        route: { provider: c.provider, model: c.model, account: c.account },
        retryAfterSec: gateResult.retryAfterSec
      };
    }
  }

  saveGate(gate);
  console.log(JSON.stringify({ ok: false, reason: 'rate_limited_all_candidates', bestRetry, worker: worker || null }, null, 2));
  process.exit(1);
}

function commandSettle() {
  const provider = arg('provider');
  const model = arg('model');
  const account = arg('account');
  const estimatedTokens = Number(arg('estimatedTokens', '0'));
  const actualTokens = Number(arg('actualTokens', '0'));

  if (!provider || !model || !account) throw new Error('Missing --provider/--model/--account');
  if (!Number.isFinite(estimatedTokens) || !Number.isFinite(actualTokens)) throw new Error('estimatedTokens/actualTokens must be numbers');

  const key = `${provider}:${model}:${account}`;
  const gate = loadGate();
  const e = gate.entries?.[key];
  if (!e) {
    console.log(JSON.stringify({ ok: true, warning: 'no_gate_entry', key }, null, 2));
    return;
  }

  const delta = actualTokens - estimatedTokens;
  e.usedTokens = Math.max(0, (e.usedTokens || 0) + delta);
  e.updatedAt = nowIso();
  gate.entries[key] = e;
  saveGate(gate);

  console.log(JSON.stringify({ ok: true, key, adjustedBy: delta, usedTokens: e.usedTokens }, null, 2));
}

function commandStatus() {
  const gate = loadGate();
  console.log(JSON.stringify(gate, null, 2));
}

function commandReset() {
  saveGate({ updatedAt: nowIso(), entries: {} });
  console.log(JSON.stringify({ ok: true, reset: true }, null, 2));
}

function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'acquire-route':
      commandAcquireRoute();
      break;
    case 'settle':
      commandSettle();
      break;
    case 'status':
      commandStatus();
      break;
    case 'reset':
      commandReset();
      break;
    default:
      console.error('Usage: acquire-route|settle|status|reset [flags]');
      process.exit(2);
  }
}

try {
  main();
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
