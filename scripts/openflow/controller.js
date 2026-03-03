#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG_PATH = process.env.OPENFLOW_CONFIG_PATH || path.join(ROOT, 'config/openflow/master-config.json');
const STATE_PATH = process.env.OPENFLOW_STATE_PATH || path.join(ROOT, 'config/openflow/runtime-state.json');
const CATALOG_PATH = process.env.OPENFLOW_CATALOG_PATH || path.join(ROOT, 'config/openflow/free-model-catalog.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
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

function computeUsagePercent(rateLimit = {}) {
  const requestPairs = [
    ['x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests'],
    ['x-ratelimit-limit-requests-day', 'x-ratelimit-remaining-requests-day'],
    ['x-ratelimit-limit-requests-minute', 'x-ratelimit-remaining-requests-minute']
  ];

  const tokenPairs = [
    ['x-ratelimit-limit-tokens', 'x-ratelimit-remaining-tokens'],
    ['x-ratelimit-limit-tokens-minute', 'x-ratelimit-remaining-tokens-minute']
  ];

  const percents = [];

  for (const [l, r] of [...requestPairs, ...tokenPairs]) {
    const limit = toNum(rateLimit[l]);
    const remain = toNum(rateLimit[r]);
    if (limit && remain != null && limit > 0) {
      const used = ((limit - remain) / limit) * 100;
      percents.push(Math.max(0, Math.min(100, used)));
    }
  }

  if (!percents.length) return null;
  return Math.max(...percents);
}

function getCatalogScore(catalog, providerId, modelId) {
  const p = String(providerId || '').toLowerCase();
  const m = String(modelId || '');
  const item = (catalog.items || []).find(
    (x) => String(x.provider || '').toLowerCase() === p && String(x.model || '') === m
  );
  return item?.rankScore ?? 0;
}

function freeWindowBoost(model) {
  const until = model?.freeWindow?.freeUntil;
  if (!until) return 0;
  const ms = new Date(until).getTime() - Date.now();
  if (Number.isNaN(ms)) return 0;
  if (ms <= 0) return -100;
  return Math.min(20, Math.floor(ms / (1000 * 60 * 60 * 24))); // up to +20 for long remaining windows
}

function candidateList(cfg, state, catalog) {
  const out = [];
  for (const p of cfg.providers || []) {
    if (!p.enabled) continue;
    for (const m of p.models || []) {
      if (m.enabled === false) continue;
      for (const a of p.accounts || []) {
        const hasKey = !!process.env[a.authEnv];
        const healthKey = `${p.id}:${m.id}:${a.id}`;
        const health = state.health?.[healthKey] || {};
        const priorityScore = Math.max(0, 100 - ((m.priority || 100) * 5));
        const catalogScore = getCatalogScore(catalog, p.id, m.id);
        const score = priorityScore + catalogScore + freeWindowBoost(m) + (hasKey ? 10 : -30) + (health.ok === false ? -40 : 0);

        out.push({
          provider: p.id,
          model: m.id,
          account: a.id,
          authEnv: a.authEnv,
          healthKey,
          hasKey,
          health,
          score
        });
      }
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function selectBestCandidate(cfg, state, catalog, opts = {}) {
  const excludeKey = opts.excludeKey || null;
  const list = candidateList(cfg, state, catalog).filter((c) => {
    if (!c.hasKey) return false;
    if (c.health?.ok === false) return false;
    if (excludeKey && c.healthKey === excludeKey) return false;
    return true;
  });
  return list[0] || null;
}

function saveStatePatch(patch) {
  const state = readJson(STATE_PATH);
  const merged = { ...state, ...patch, updatedAt: nowIso() };
  writeJson(STATE_PATH, merged);
  return merged;
}

function guardInfo(state) {
  const g = state.guard || {};
  const untilMs = g.lockedUntil ? new Date(g.lockedUntil).getTime() : null;
  const now = Date.now();
  const active = !!(g.locked && untilMs && untilMs > now);
  return {
    active,
    lockedUntil: g.lockedUntil || null,
    reason: g.reason || null,
    pendingSwitch: g.pendingSwitch || null,
    remainingSec: active ? Math.ceil((untilMs - now) / 1000) : 0
  };
}

function cmdStatus() {
  const cfg = readJson(CFG_PATH);
  const state = readJson(STATE_PATH);
  const catalog = readJson(CATALOG_PATH);
  const list = candidateList(cfg, state, catalog);
  const gi = guardInfo(state);

  console.log(`Active: ${state.active?.provider || '-'} / ${state.active?.model || '-'} / ${state.active?.account || '-'}`);
  console.log(`Guard: ${gi.active ? 'LOCKED' : 'unlocked'}${gi.active ? ` until ${gi.lockedUntil} (${gi.remainingSec}s)` : ''}${gi.reason ? ` :: ${gi.reason}` : ''}`);
  if (gi.pendingSwitch) {
    console.log(`Pending switch: ${JSON.stringify(gi.pendingSwitch)}`);
  }
  console.log('');
  console.log('Candidates (top 10):');
  list.slice(0, 10).forEach((c, i) => {
    const health = c.health?.ok === false ? 'FAIL' : 'OK/UNK';
    console.log(`${i + 1}. score=${c.score} :: ${c.provider} :: ${c.model} :: ${c.account} :: key=${c.hasKey ? 'yes' : 'no'} :: health=${health}`);
  });
}

function cmdSelect() {
  const cfg = readJson(CFG_PATH);
  const state = readJson(STATE_PATH);
  const catalog = readJson(CATALOG_PATH);
  const winner = selectBestCandidate(cfg, state, catalog);

  if (!winner) {
    console.error('No valid candidate found (missing keys or failed health).');
    process.exit(2);
  }
  const next = saveStatePatch({
    active: {
      provider: winner.provider,
      model: winner.model,
      account: winner.account
    }
  });

  console.log(`Selected: ${winner.provider} / ${winner.model} / ${winner.account}`);

  if (cfg.gateway?.autoRestartOnSwitch) {
    const result = spawnSync('openclaw', ['gateway', 'restart'], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }

  console.log(`State updated: ${STATE_PATH}`);
  console.log(`updatedAt: ${next.updatedAt}`);
}

function cmdSelectNext() {
  const cfg = readJson(CFG_PATH);
  const state = readJson(STATE_PATH);
  const catalog = readJson(CATALOG_PATH);

  const provider = process.argv[3] || state.active?.provider;
  const model = process.argv[4] || state.active?.model;
  const account = process.argv[5] || state.active?.account;

  if (!provider || !model || !account) {
    console.error('Usage: select-next [provider] [model] [account]');
    process.exit(2);
  }

  const excludeKey = `${provider}:${model}:${account}`;
  const winner = selectBestCandidate(cfg, state, catalog, { excludeKey });

  if (!winner) {
    console.error('No alternate candidate found.');
    process.exit(2);
  }

  const next = saveStatePatch({
    active: {
      provider: winner.provider,
      model: winner.model,
      account: winner.account
    }
  });

  console.log(`Selected next: ${winner.provider} / ${winner.model} / ${winner.account}`);
  console.log(`State updated: ${STATE_PATH}`);
  console.log(`updatedAt: ${next.updatedAt}`);
}

function cmdQuota() {
  const state = readJson(STATE_PATH);
  const provider = process.argv[3] || state.active?.provider;
  const model = process.argv[4] || state.active?.model;
  const account = process.argv[5] || state.active?.account;

  if (!provider || !model || !account) {
    console.error('Usage: quota [provider] [model] [account]');
    process.exit(2);
  }

  const key = `${provider}:${model}:${account}`;
  const health = state.health?.[key] || {};
  const rateLimit = health.rateLimit || {};
  const usedPct = computeUsagePercent(rateLimit);

  console.log(`Target: ${key}`);
  console.log(`ok: ${health.ok === undefined ? 'unknown' : String(health.ok)} status: ${health.status ?? 'n/a'} checkedAt: ${health.checkedAt ?? 'n/a'}`);
  console.log(`usedPercent(max-known): ${usedPct == null ? 'unknown' : usedPct.toFixed(2) + '%'}`);
  console.log('rateLimitHeaders:');
  console.log(JSON.stringify(rateLimit, null, 2));
}

function cmdMaybeSwitch() {
  const cfg = readJson(CFG_PATH);
  const state = readJson(STATE_PATH);
  const catalog = readJson(CATALOG_PATH);

  const provider = process.argv[3] || state.active?.provider;
  const model = process.argv[4] || state.active?.model;
  const account = process.argv[5] || state.active?.account;

  if (!provider || !model || !account) {
    console.error('Usage: maybe-switch [provider] [model] [account]');
    process.exit(2);
  }

  const key = `${provider}:${model}:${account}`;
  const health = state.health?.[key] || {};
  const usedPct = computeUsagePercent(health.rateLimit || {});
  const threshold = cfg.routing?.switchBeforePercent ?? 85;

  const shouldSwitch = health.ok === false || (usedPct != null && usedPct >= threshold);

  if (!shouldSwitch) {
    if (state.guard?.pendingSwitch) {
      state.guard.pendingSwitch = null;
      state.updatedAt = nowIso();
      writeJson(STATE_PATH, state);
    }
    console.log(`No switch needed for ${key}. used=${usedPct == null ? 'unknown' : usedPct.toFixed(2) + '%'} threshold=${threshold}%`);
    return;
  }

  const gi = guardInfo(state);
  const healthFail = health.ok === false;

  // if task guard is active, defer quota-based switches to avoid disrupting in-flight tasks
  if (gi.active && !healthFail) {
    state.guard = state.guard || {};
    state.guard.pendingSwitch = {
      from: key,
      reason: `usage ${usedPct == null ? 'unknown' : usedPct.toFixed(2) + '%'} >= ${threshold}%`,
      requestedAt: nowIso()
    };
    state.updatedAt = nowIso();
    writeJson(STATE_PATH, state);
    console.log(`Switch deferred (guard locked): ${key}`);
    return;
  }

  const winner = selectBestCandidate(cfg, state, catalog, { excludeKey: key });
  if (!winner) {
    console.error('Switch requested but no alternate candidate available.');
    process.exit(2);
  }

  const next = saveStatePatch({
    active: {
      provider: winner.provider,
      model: winner.model,
      account: winner.account
    },
    guard: {
      ...(state.guard || {}),
      pendingSwitch: null
    }
  });

  console.log(`Switched: ${key} -> ${winner.provider}:${winner.model}:${winner.account}`);
  console.log(`Reason: ${healthFail ? 'health-fail' : `usage ${usedPct.toFixed(2)}% >= ${threshold}%`}`);
  console.log(`updatedAt: ${next.updatedAt}`);
}

function cmdLock() {
  const minutesRaw = process.argv[3];
  const minutes = minutesRaw ? Number(minutesRaw) : 30;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    console.error('Usage: lock [minutes] [reason]');
    process.exit(2);
  }
  const reason = process.argv.slice(4).join(' ').trim() || 'task-protect';
  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  const state = readJson(STATE_PATH);
  state.guard = state.guard || {};
  state.guard.locked = true;
  state.guard.lockedUntil = until;
  state.guard.reason = reason;
  state.guard.lockedAt = nowIso();
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);

  console.log(`Guard locked until ${until} :: ${reason}`);
}

function cmdUnlock() {
  const state = readJson(STATE_PATH);
  state.guard = state.guard || {};
  state.guard.locked = false;
  state.guard.lockedUntil = null;
  state.guard.reason = null;
  state.guard.unlockedAt = nowIso();
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);
  console.log('Guard unlocked');
}

function cmdGuard() {
  const state = readJson(STATE_PATH);
  const gi = guardInfo(state);
  console.log(JSON.stringify(gi, null, 2));
}

function cmdMark(ok) {
  const [provider, model, account, ...reasonParts] = process.argv.slice(3);
  if (!provider || !model || !account) {
    console.error('Usage: mark-success|mark-failure <provider> <model> <account> [reason]');
    process.exit(2);
  }
  const reason = reasonParts.join(' ').trim() || null;
  const state = readJson(STATE_PATH);
  const key = `${provider}:${model}:${account}`;
  state.health = state.health || {};
  state.health[key] = {
    ok,
    reason,
    checkedAt: nowIso()
  };
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);
  console.log(`Marked ${ok ? 'SUCCESS' : 'FAIL'} for ${key}`);
}

function cmdGateway(action) {
  if (!['status', 'start', 'stop', 'restart'].includes(action)) {
    console.error('Usage: gateway status|start|stop|restart');
    process.exit(2);
  }
  const result = spawnSync('openclaw', ['gateway', action], { stdio: 'inherit' });
  process.exit(result.status || 0);
}

const cmd = process.argv[2] || 'status';

switch (cmd) {
  case 'status':
    cmdStatus();
    break;
  case 'select':
    cmdSelect();
    break;
  case 'select-next':
    cmdSelectNext();
    break;
  case 'quota':
    cmdQuota();
    break;
  case 'maybe-switch':
    cmdMaybeSwitch();
    break;
  case 'lock':
    cmdLock();
    break;
  case 'unlock':
    cmdUnlock();
    break;
  case 'guard':
    cmdGuard();
    break;
  case 'mark-success':
    cmdMark(true);
    break;
  case 'mark-failure':
    cmdMark(false);
    break;
  case 'gateway':
    cmdGateway(process.argv[3]);
    break;
  default:
    console.error('Usage: status | select | select-next | quota | maybe-switch | lock | unlock | guard | mark-success | mark-failure | gateway');
    process.exit(2);
}
