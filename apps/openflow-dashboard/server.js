#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const HOST = process.env.OPENFLOW_DASHBOARD_HOST || '127.0.0.1';
const PORT = Number(process.env.OPENFLOW_DASHBOARD_PORT || '18888');
const DASH_TOKEN = process.env.OPENFLOW_DASHBOARD_TOKEN || '';
const PUBLIC_DIR = path.join(ROOT, 'apps/openflow-dashboard/public');

const PATHS = {
  config: path.join(ROOT, 'config/openflow/subagent/master-config.json'),
  state: path.join(ROOT, 'config/openflow/subagent/runtime-state.json'),
  catalog: path.join(ROOT, 'config/openflow/subagent/free-model-catalog.json'),
  daily: path.join(ROOT, 'config/openflow/subagent/daily-sync-latest.json'),
  gate: path.join(ROOT, 'config/openflow/subagent/rate-gate-state.json'),
  pipeline: path.join(ROOT, 'config/openflow/subagent/role-pipeline.json'),
  policy: path.join(ROOT, 'config/openflow/subagent/searcher-policy.json'),
  autoswitchLog: path.join(ROOT, 'logs/subagent-autoswitch.log'),
  policyLog: path.join(ROOT, 'logs/searcher-policy.log'),
  dashboardLog: path.join(ROOT, 'logs/openflow-dashboard.log')
};

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function readTextSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function tailLines(p, maxLines = 80) {
  const txt = readTextSafe(p);
  if (!txt) return [];
  return txt.trim().split(/\r?\n/).slice(-maxLines);
}

function json(res, code, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function serveFile(res, file, type = 'text/html; charset=utf-8') {
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: 'not_found' });
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}

function isAuthorized(req, urlObj) {
  if (!DASH_TOKEN) return true;
  const q = urlObj.searchParams.get('token');
  const h = req.headers['x-openflow-token'];
  const a = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  return q === DASH_TOKEN || h === DASH_TOKEN || a === DASH_TOKEN;
}

function sanitizeConfig(cfg) {
  if (!cfg) return cfg;
  const clone = JSON.parse(JSON.stringify(cfg));
  for (const p of clone.providers || []) {
    for (const a of p.accounts || []) {
      a.status = a.status || 'configured';
    }
  }
  return clone;
}

function toNum(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function computeRateUsagePct(rateLimit = {}) {
  const pairs = [
    ['x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests'],
    ['x-ratelimit-limit-requests-minute', 'x-ratelimit-remaining-requests-minute'],
    ['x-ratelimit-limit-tokens', 'x-ratelimit-remaining-tokens'],
    ['x-ratelimit-limit-tokens-minute', 'x-ratelimit-remaining-tokens-minute']
  ];
  const vals = [];
  for (const [l, r] of pairs) {
    const limit = toNum(rateLimit[l]);
    const rem = toNum(rateLimit[r]);
    if (limit && rem != null && limit > 0) {
      const pct = ((limit - rem) / limit) * 100;
      vals.push(Math.max(0, Math.min(100, pct)));
    }
  }
  if (!vals.length) return null;
  return Math.max(...vals);
}

function latestCheckedAt(health = {}) {
  let latest = null;
  for (const [, v] of Object.entries(health || {})) {
    const t = v?.checkedAt || null;
    if (!t) continue;
    if (!latest || String(t) > String(latest)) latest = t;
  }
  return latest;
}

function buildSummary(state, cfg, daily, gate, catalog, pipeline, policy) {
  const health = state?.health || {};
  const entries = Object.entries(health);

  let pass = 0; let fail = 0; let unknown = 0;
  for (const [, v] of entries) {
    if (v?.ok === true) pass += 1;
    else if (v?.ok === false) fail += 1;
    else unknown += 1;
  }

  const providers = cfg?.providers || [];
  const enabledProviders = providers.filter((p) => p.enabled !== false).length;
  const enabledModels = providers.reduce((acc, p) => acc + (p.models || []).filter((m) => m.enabled !== false).length, 0);

  let latestHealth = null;
  for (const [key, v] of entries) {
    if (!latestHealth || String(v?.checkedAt || '') > String(latestHealth?.checkedAt || '')) {
      latestHealth = { key, ...v };
    }
  }

  const gateEntries = Object.values(gate?.entries || {});
  const gateMaxReq = gateEntries.reduce((m, e) => {
    if (!e?.rpmLimit || e.rpmLimit <= 0) return m;
    const v = ((e.usedRequests || 0) / e.rpmLimit) * 100;
    return Math.max(m, v);
  }, 0);
  const gateMaxTok = gateEntries.reduce((m, e) => {
    if (!e?.tpmLimit || e.tpmLimit <= 0) return m;
    const v = ((e.usedTokens || 0) / e.tpmLimit) * 100;
    return Math.max(m, v);
  }, 0);

  const active = state?.active || {};
  const activeKey = active.provider && active.model && active.account
    ? `${active.provider}:${active.model}:${active.account}`
    : null;
  const activeHealth = activeKey ? health[activeKey] || null : null;

  return {
    updatedAt: new Date().toISOString(),
    active,
    guard: state?.guard || {},
    health: {
      total: entries.length,
      pass,
      fail,
      unknown,
      latest: latestHealth
    },
    activeUsagePercent: activeHealth?.rateLimit ? computeRateUsagePct(activeHealth.rateLimit) : null,
    daily: {
      updatedAt: daily?.updatedAt || null,
      activeModelCount: daily?.activeModelCount || 0,
      added: daily?.diff?.added?.length || 0,
      removed: daily?.diff?.removed?.length || 0,
      changed: daily?.diff?.changed?.length || 0
    },
    routing: {
      strategy: cfg?.routing?.strategy || null,
      switchBeforePercent: cfg?.routing?.switchBeforePercent ?? null,
      strictMode: !!cfg?.strictMode?.enabled
    },
    config: {
      enabledProviders,
      enabledModels,
      catalogItems: (catalog?.items || []).length
    },
    gate: {
      routesTracked: gateEntries.length,
      maxRequestUtilPct: Number(gateMaxReq.toFixed(2)),
      maxTokenUtilPct: Number(gateMaxTok.toFixed(2))
    },
    pipeline: {
      roles: (pipeline?.roles || []).map((r) => ({ id: r.id, label: r.label })),
      roleCount: (pipeline?.roles || []).length
    },
    workers: {
      router: {
        provider: active?.provider || null,
        model: active?.model || null,
        account: active?.account || null,
        updatedAt: state?.updatedAt || null
      },
      tester: {
        cadence: '2x/day',
        lastCheckedAt: latestCheckedAt(health)
      },
      searcher: {
        cadence: '2x/day',
        lastSyncAt: daily?.updatedAt || null,
        activeModelCount: daily?.activeModelCount || 0
      },
      roleRouting: (pipeline?.roles || []).map((r) => {
        const routeKey = state?.routeAllocator?.workerAffinity?.[r.id] || null;
        let liveProvider = active?.provider || null;
        let liveModel = active?.model || null;
        let liveAccount = active?.account || null;

        if (routeKey) {
          const parts = String(routeKey).split(':');
          if (parts.length >= 3) {
            liveProvider = parts[0] || liveProvider;
            liveAccount = parts[parts.length - 1] || liveAccount;
            liveModel = parts.slice(1, -1).join(':') || liveModel;
          }
        }

        return {
          roleId: r.id,
          roleLabel: r.label,
          liveProvider,
          liveModel,
          liveAccount,
          routeKey
        };
      })
    },
    policy: {
      strict: !!policy?.strict,
      allowlistCount: (policy?.allowedDomains || []).length,
      blocklistCount: (policy?.blockedDomains || []).length,
      forbiddenKeywordCount: (policy?.forbiddenKeywords || []).length
    }
  };
}

function buildPack(mode, eventLimit = 40) {
  const state = readJsonSafe(PATHS.state) || {};
  const cfg = sanitizeConfig(readJsonSafe(PATHS.config)) || {};
  const daily = readJsonSafe(PATHS.daily) || {};
  const gate = readJsonSafe(PATHS.gate) || {};
  const catalog = readJsonSafe(PATHS.catalog) || {};
  const pipeline = readJsonSafe(PATHS.pipeline) || {};
  const policy = readJsonSafe(PATHS.policy) || {};

  const summary = buildSummary(state, cfg, daily, gate, catalog, pipeline, policy);
  const pack = {
    mode,
    generatedAt: new Date().toISOString(),
    summary,
    state: {
      active: state.active || {},
      guard: state.guard || {},
      health: state.health || {}
    },
    gate,
    events: {
      autoswitch: tailLines(PATHS.autoswitchLog, eventLimit),
      policy: tailLines(PATHS.policyLog, eventLimit)
    }
  };

  if (mode === 'full') {
    pack.config = cfg;
    pack.daily = daily;
    pack.pipeline = pipeline;
    pack.policy = policy;
    pack.events.dashboard = tailLines(PATHS.dashboardLog, eventLimit);
  }

  return pack;
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (u.pathname.startsWith('/api/')) {
    if (!isAuthorized(req, u)) return json(res, 401, { error: 'unauthorized' });
  }

  if (u.pathname === '/api/health') return json(res, 200, { ok: true, ts: new Date().toISOString() });

  if (u.pathname === '/api/state') return json(res, 200, readJsonSafe(PATHS.state) || {});
  if (u.pathname === '/api/config') return json(res, 200, sanitizeConfig(readJsonSafe(PATHS.config)) || {});
  if (u.pathname === '/api/catalog') return json(res, 200, readJsonSafe(PATHS.catalog) || {});
  if (u.pathname === '/api/daily') return json(res, 200, readJsonSafe(PATHS.daily) || {});
  if (u.pathname === '/api/gate') return json(res, 200, readJsonSafe(PATHS.gate) || {});
  if (u.pathname === '/api/pipeline') return json(res, 200, readJsonSafe(PATHS.pipeline) || {});
  if (u.pathname === '/api/policy') return json(res, 200, readJsonSafe(PATHS.policy) || {});

  if (u.pathname === '/api/events') {
    const limit = Math.max(10, Math.min(300, Number(u.searchParams.get('limit') || 80)));
    return json(res, 200, {
      updatedAt: new Date().toISOString(),
      autoswitch: tailLines(PATHS.autoswitchLog, limit),
      policy: tailLines(PATHS.policyLog, limit),
      dashboard: tailLines(PATHS.dashboardLog, limit)
    });
  }

  if (u.pathname === '/api/summary') {
    const state = readJsonSafe(PATHS.state) || {};
    const cfg = sanitizeConfig(readJsonSafe(PATHS.config)) || {};
    const daily = readJsonSafe(PATHS.daily) || {};
    const gate = readJsonSafe(PATHS.gate) || {};
    const catalog = readJsonSafe(PATHS.catalog) || {};
    const pipeline = readJsonSafe(PATHS.pipeline) || {};
    const policy = readJsonSafe(PATHS.policy) || {};
    return json(res, 200, buildSummary(state, cfg, daily, gate, catalog, pipeline, policy));
  }

  if (u.pathname === '/api/pack/live') {
    const events = Math.max(10, Math.min(120, Number(u.searchParams.get('events') || 40)));
    return json(res, 200, buildPack('live', events));
  }

  if (u.pathname === '/api/pack/full') {
    const events = Math.max(20, Math.min(200, Number(u.searchParams.get('events') || 80)));
    return json(res, 200, buildPack('full', events));
  }

  if (u.pathname === '/' || u.pathname === '/index.html') {
    return serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
  }
  if (u.pathname === '/app.js') {
    return serveFile(res, path.join(PUBLIC_DIR, 'app.js'), 'application/javascript; charset=utf-8');
  }
  if (u.pathname === '/styles.css') {
    return serveFile(res, path.join(PUBLIC_DIR, 'styles.css'), 'text/css; charset=utf-8');
  }

  return json(res, 404, { error: 'not_found' });
});

server.listen(PORT, HOST, () => {
  console.log(`OpenFlow dashboard running on http://${HOST}:${PORT} auth=${DASH_TOKEN ? 'token' : 'none'}`);
});
