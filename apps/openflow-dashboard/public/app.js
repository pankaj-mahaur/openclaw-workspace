const TOKEN = new URLSearchParams(location.search).get('token') || '';

const appState = {
  paused: false,
  intervalMs: 10000,
  fullRefreshEvery: 6, // full payload every ~60s when interval is 10s
  tick: 0,
  timer: null,
  countdownTimer: null,
  nextRefreshInSec: 10,
  lastMode: 'live',
  data: {
    summary: {},
    state: {},
    config: {},
    daily: {},
    gate: {},
    pipeline: {},
    policy: {},
    events: {}
  },
  modelsRows: [],
  healthRows: [],
  modelPage: 1
};

function withToken(url) {
  if (!TOKEN) return url;
  const u = new URL(url, location.origin);
  u.searchParams.set('token', TOKEN);
  return u.toString();
}

async function get(url) {
  const r = await fetch(withToken(url));
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${url} -> ${r.status} ${body.error || ''}`.trim());
  return body;
}

function fmt(obj) {
  return JSON.stringify(obj, null, 2);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toNum(v) {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function usagePctFromRate(rate = {}) {
  const pairs = [
    ['x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests'],
    ['x-ratelimit-limit-requests-minute', 'x-ratelimit-remaining-requests-minute'],
    ['x-ratelimit-limit-tokens', 'x-ratelimit-remaining-tokens'],
    ['x-ratelimit-limit-tokens-minute', 'x-ratelimit-remaining-tokens-minute']
  ];
  const vals = [];
  for (const [l, r] of pairs) {
    const limit = toNum(rate[l]);
    const rem = toNum(rate[r]);
    if (limit && rem != null && limit > 0) {
      vals.push(Math.max(0, Math.min(100, ((limit - rem) / limit) * 100)));
    }
  }
  if (!vals.length) return null;
  return Math.max(...vals);
}

function badge(text, cls = 'info') {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

function setMeta(msg, isError = false) {
  const meta = document.getElementById('meta');
  meta.textContent = msg;
  meta.classList.toggle('error', !!isError);
}

function setLiveIndicator(ok = true) {
  const dot = document.getElementById('liveDot');
  dot.classList.toggle('dead', !ok);
}

function setRefreshBadge() {
  const badgeEl = document.getElementById('refreshBadge');
  const pageMode = document.hidden ? 'BACKGROUND (slow mode)' : 'FOREGROUND';
  badgeEl.textContent = `Fetch: ${appState.lastMode.toUpperCase()} • ${pageMode}`;
}

function setCountdownText() {
  const countdown = document.getElementById('countdown');
  if (appState.paused) {
    countdown.textContent = 'refresh paused';
    return;
  }
  countdown.textContent = `next refresh in ${Math.max(0, appState.nextRefreshInSec)}s`;
}

function renderKpis(summary) {
  const active = summary.active || {};
  const guard = summary.guard || {};
  const health = summary.health || {};

  const activeLabel = [active.provider, active.model, active.account].filter(Boolean).join(' / ');
  document.getElementById('kpiActive').textContent = activeLabel || 'No active route';
  document.getElementById('kpiActiveSub').textContent = `Active usage: ${summary.activeUsagePercent == null ? 'unknown' : `${summary.activeUsagePercent.toFixed(1)}%`}`;

  const guardText = guard.locked ? 'LOCKED' : 'UNLOCKED';
  document.getElementById('kpiGuard').innerHTML = `${badge(guardText, guard.locked ? 'warn' : 'ok')} ${badge(`switch@${summary.routing?.switchBeforePercent ?? '-'}%`, 'info')}`;
  document.getElementById('kpiRouting').textContent = `Strategy: ${summary.routing?.strategy || '-'} • Strict mode: ${summary.routing?.strictMode ? 'ON' : 'OFF'}`;

  const chips = document.getElementById('kpiHealthChips');
  chips.innerHTML = [
    badge(`PASS ${health.pass || 0}`, 'ok'),
    badge(`FAIL ${health.fail || 0}`, 'bad'),
    badge(`UNK ${health.unknown || 0}`, 'muted')
  ].join(' ');
  document.getElementById('kpiHealthSub').textContent = `Latest check: ${health.latest?.checkedAt || '-'}`;

  const reqPct = summary.gate?.maxRequestUtilPct || 0;
  const tokPct = summary.gate?.maxTokenUtilPct || 0;
  document.getElementById('barReq').style.width = `${Math.min(100, reqPct)}%`;
  document.getElementById('barTok').style.width = `${Math.min(100, tokPct)}%`;
  document.getElementById('barReqText').textContent = `${reqPct.toFixed(1)}%`;
  document.getElementById('barTokText').textContent = `${tokPct.toFixed(1)}%`;
}

function renderWorkers(summary = {}) {
  const wrap = document.getElementById('workersGrid');
  const workers = summary.workers || {};
  const roles = workers.roleRouting || [];

  const cards = [];

  const router = workers.router || {};
  cards.push(`
    <article class="worker-card main-route">
      <h3>Router / Live Route</h3>
      <div class="worker-model">${escapeHtml([router.provider, router.model, router.account].filter(Boolean).join(' / ') || 'n/a')}</div>
      <div class="muted">updated: ${escapeHtml(router.updatedAt || '-')}</div>
    </article>
  `);

  const tester = workers.tester || {};
  cards.push(`
    <article class="worker-card tester">
      <h3>Tester</h3>
      <div class="worker-model">cadence: ${escapeHtml(tester.cadence || '-')}</div>
      <div class="muted">last checked: ${escapeHtml(tester.lastCheckedAt || '-')}</div>
    </article>
  `);

  const searcher = workers.searcher || {};
  cards.push(`
    <article class="worker-card searcher">
      <h3>Searcher</h3>
      <div class="worker-model">cadence: ${escapeHtml(searcher.cadence || '-')}</div>
      <div class="muted">last sync: ${escapeHtml(searcher.lastSyncAt || '-')}</div>
      <div class="muted">active models tracked: ${escapeHtml(searcher.activeModelCount ?? '-')}</div>
    </article>
  `);

  for (const r of roles) {
    cards.push(`
      <article class="worker-card role-card">
        <h3>${escapeHtml(r.roleLabel || r.roleId || 'Role')}</h3>
        <div class="worker-model">${escapeHtml([r.liveProvider, r.liveModel, r.liveAccount].filter(Boolean).join(' / ') || 'n/a')}</div>
        <div class="muted">roleId: ${escapeHtml(r.roleId || '-')}</div>
        <div class="muted">route: ${escapeHtml(r.routeKey || 'fallback(active)')}</div>
      </article>
    `);
  }

  wrap.innerHTML = cards.join('');
  document.getElementById('workersUpdated').textContent = `updated ${summary.updatedAt || '-'}`;
}

function renderPipeline(pipeline = {}) {
  const roles = pipeline.roles || [];
  const wrap = document.getElementById('pipelineRoles');
  document.getElementById('pipelineCount').textContent = `${roles.length} roles`;
  if (!roles.length) {
    wrap.innerHTML = '<div class="muted">No role pipeline config found.</div>';
    return;
  }
  wrap.innerHTML = roles.map((r, i) => `
    <div class="pipe-step">
      <div class="pipe-index">${i + 1}</div>
      <div>
        <div class="pipe-title">${escapeHtml(r.label || r.id)}</div>
        <div class="pipe-sub">${escapeHtml(r.id)}</div>
      </div>
    </div>
  `).join('<div class="pipe-arrow">→</div>');
}

function renderDaily(daily = {}, summary = {}) {
  document.getElementById('dailyUpdated').textContent = daily.updatedAt || summary?.daily?.updatedAt || '-';
  const chips = document.getElementById('dailyChips');
  chips.innerHTML = [
    badge(`Active Models ${summary.daily?.activeModelCount || 0}`, 'info'),
    badge(`Added ${summary.daily?.added || 0}`, 'ok'),
    badge(`Removed ${summary.daily?.removed || 0}`, 'bad'),
    badge(`Changed ${summary.daily?.changed || 0}`, 'warn')
  ].join(' ');

  const setList = (id, arr) => {
    const el = document.getElementById(id);
    const list = Array.isArray(arr) ? arr : [];
    if (!list.length) {
      el.innerHTML = '<li class="muted">None</li>';
      return;
    }
    el.innerHTML = list.slice(0, 20).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  };

  setList('dailyAdded', daily?.diff?.added || []);
  setList('dailyRemoved', daily?.diff?.removed || []);
  setList('dailyChanged', daily?.diff?.changed || []);
}

function buildModelsRows(cfg = {}) {
  const rows = [];
  for (const p of cfg.providers || []) {
    for (const m of p.models || []) {
      rows.push({
        provider: p.id,
        model: m.id,
        priority: m.priority ?? 99,
        rpm: m.limits?.rpm ?? '-',
        tpm: m.limits?.tpm ?? '-',
        enabled: m.enabled !== false
      });
    }
  }
  rows.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    return a.model.localeCompare(b.model);
  });
  return rows;
}

function syncProviderFilter(rows) {
  const select = document.getElementById('providerFilter');
  const current = select.value;
  const providers = [...new Set(rows.map((r) => r.provider))].sort();
  select.innerHTML = `<option value="all">All providers</option>${providers.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}`;
  if (providers.includes(current)) select.value = current;
}

function renderModelsTable() {
  const tbody = document.querySelector('#modelsTable tbody');
  const q = (document.getElementById('modelSearch').value || '').trim().toLowerCase();
  const provider = document.getElementById('providerFilter').value;
  const pageSizeRaw = document.getElementById('modelPageSize')?.value || '25';

  const filtered = appState.modelsRows.filter((r) => {
    if (provider !== 'all' && r.provider !== provider) return false;
    if (!q) return true;
    return `${r.provider} ${r.model}`.toLowerCase().includes(q);
  });

  const pageSize = pageSizeRaw === 'all' ? Math.max(1, filtered.length) : Math.max(1, Number(pageSizeRaw) || 25);
  const totalPages = pageSizeRaw === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  appState.modelPage = Math.min(Math.max(1, appState.modelPage), totalPages);

  const start = pageSizeRaw === 'all' ? 0 : ((appState.modelPage - 1) * pageSize);
  const pageRows = pageSizeRaw === 'all' ? filtered : filtered.slice(start, start + pageSize);

  const pageInfo = document.getElementById('modelPageInfo');
  const prevBtn = document.getElementById('modelPrevPage');
  const nextBtn = document.getElementById('modelNextPage');
  const meta = document.getElementById('modelsMeta');

  if (pageInfo) pageInfo.textContent = `Page ${appState.modelPage}/${totalPages}`;
  if (prevBtn) prevBtn.disabled = appState.modelPage <= 1;
  if (nextBtn) nextBtn.disabled = appState.modelPage >= totalPages;

  if (meta) {
    if (!filtered.length) {
      meta.textContent = 'Showing 0 of 0 models';
    } else {
      meta.textContent = `Showing ${start + 1}-${start + pageRows.length} of ${filtered.length} models`;
    }
  }

  tbody.innerHTML = '';
  pageRows.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${start + i + 1}</td>
      <td>${escapeHtml(r.provider)}</td>
      <td>${escapeHtml(r.model)}</td>
      <td>${escapeHtml(r.priority)}</td>
      <td>${escapeHtml(r.rpm)}</td>
      <td>${escapeHtml(r.tpm)}</td>
      <td>${r.enabled ? badge('enabled', 'ok') : badge('disabled', 'muted')}</td>
    `;
    tbody.appendChild(tr);
  });

  if (!pageRows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="muted">No matching models.</td></tr>';
  }
}

function renderHealthTable(state = {}) {
  const statusFilter = document.getElementById('healthStatusFilter').value;
  const rowLimit = document.getElementById('healthLimit').value;
  const failFirst = document.getElementById('healthFailFirst').checked;
  const q = (document.getElementById('healthSearch').value || '').trim().toLowerCase();
  const tbody = document.querySelector('#healthTable tbody');

  const severity = { fail: 0, unk: 1, pass: 2 };

  const rows = Object.entries(state.health || {}).map(([k, v]) => {
    const [provider, model, account] = k.split(':');
    const status = v.ok === true ? 'pass' : (v.ok === false ? 'fail' : 'unk');
    const usage = usagePctFromRate(v.rateLimit || {});
    return {
      provider,
      model,
      account,
      status,
      statusText: status.toUpperCase(),
      usage,
      checkedAt: v.checkedAt || '-'
    };
  }).sort((a, b) => {
    if (failFirst && severity[a.status] !== severity[b.status]) return severity[a.status] - severity[b.status];
    return String(b.checkedAt).localeCompare(String(a.checkedAt));
  });

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!q) return true;
    return `${r.provider} ${r.model} ${r.account}`.toLowerCase().includes(q);
  });

  const limited = rowLimit === 'all' ? filtered : filtered.slice(0, Number(rowLimit));

  const byProvider = {};
  for (const r of filtered) {
    byProvider[r.provider] = byProvider[r.provider] || { pass: 0, fail: 0, unk: 0, total: 0 };
    byProvider[r.provider][r.status] += 1;
    byProvider[r.provider].total += 1;
  }

  const providerChips = document.getElementById('healthProviderChips');
  providerChips.innerHTML = Object.entries(byProvider)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([p, s]) => badge(`${p}: ${s.fail}F / ${s.unk}U / ${s.pass}P`, s.fail ? 'bad' : (s.unk ? 'warn' : 'ok')))
    .join(' ') || '<span class="muted">No providers in current filter</span>';

  document.getElementById('healthMeta').textContent = `Showing ${limited.length} of ${filtered.length} filtered rows • total raw ${rows.length}`;

  tbody.innerHTML = '';
  limited.forEach((r) => {
    const tr = document.createElement('tr');
    const cls = r.status === 'pass' ? 'ok' : (r.status === 'fail' ? 'bad' : 'muted');
    tr.innerHTML = `
      <td>${escapeHtml(r.provider)}</td>
      <td>${escapeHtml(r.model)}</td>
      <td>${escapeHtml(r.account)}</td>
      <td>${badge(r.statusText, cls)}</td>
      <td>${r.usage == null ? '-' : `${r.usage.toFixed(1)}%`}</td>
      <td>${escapeHtml(r.checkedAt)}</td>
    `;
    tbody.appendChild(tr);
  });

  if (!limited.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">No health rows matched.</td></tr>';
  }
}

function renderGateTable(gate = {}) {
  const tbody = document.querySelector('#gateTable tbody');
  tbody.innerHTML = '';
  const entries = Object.entries(gate.entries || {});

  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">No gate entries yet.</td></tr>';
    return;
  }

  entries.sort((a, b) => String(b[1].updatedAt || '').localeCompare(String(a[1].updatedAt || '')));

  for (const [route, e] of entries) {
    const reqPct = e.rpmLimit ? ((e.usedRequests || 0) / e.rpmLimit) * 100 : null;
    const tokPct = e.tpmLimit ? ((e.usedTokens || 0) / e.tpmLimit) * 100 : null;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(route)}</td>
      <td>${escapeHtml(`${e.windowSec || '-'}s`)}</td>
      <td>${escapeHtml(`${e.usedRequests || 0}/${e.rpmLimit || '-'}`)} ${reqPct == null ? '' : `(${reqPct.toFixed(1)}%)`}</td>
      <td>${escapeHtml(`${e.usedTokens || 0}/${e.tpmLimit || '-'}`)} ${tokPct == null ? '' : `(${tokPct.toFixed(1)}%)`}</td>
      <td>${escapeHtml(e.updatedAt || '-')}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderPolicy(policy = {}) {
  const text = `strict=${!!policy.strict} • allowlist=${(policy.allowedDomains || []).length} • blocklist=${(policy.blockedDomains || []).length} • forbiddenKeywords=${(policy.forbiddenKeywords || []).length}`;
  document.getElementById('policySummary').textContent = text;
  document.getElementById('policyRaw').textContent = fmt(policy);
}

function renderEvents(events = {}) {
  document.getElementById('eventsAutoswitch').textContent = (events.autoswitch || []).join('\n') || '-';
  document.getElementById('eventsPolicy').textContent = (events.policy || []).join('\n') || '-';
}

function renderRaw(state, summary, gate) {
  document.getElementById('rawState').textContent = fmt(state || {});
  document.getElementById('rawSummary').textContent = fmt(summary || {});
  document.getElementById('rawGate').textContent = fmt(gate || {});
}

function mergePack(pack) {
  appState.data.summary = pack.summary || appState.data.summary;
  appState.data.state = pack.state || appState.data.state;
  appState.data.gate = pack.gate || appState.data.gate;
  appState.data.events = pack.events || appState.data.events;

  if (pack.mode === 'full') {
    appState.data.config = pack.config || appState.data.config;
    appState.data.daily = pack.daily || appState.data.daily;
    appState.data.pipeline = pack.pipeline || appState.data.pipeline;
    appState.data.policy = pack.policy || appState.data.policy;
    appState.modelsRows = buildModelsRows(appState.data.config);
    syncProviderFilter(appState.modelsRows);
  }
}

function renderAll() {
  renderKpis(appState.data.summary || {});
  renderWorkers(appState.data.summary || {});
  renderPipeline(appState.data.pipeline || {});
  renderDaily(appState.data.daily || {}, appState.data.summary || {});
  renderModelsTable();
  renderHealthTable(appState.data.state || {});
  renderGateTable(appState.data.gate || {});
  renderPolicy(appState.data.policy || {});
  renderEvents(appState.data.events || {});
  renderRaw(appState.data.state || {}, appState.data.summary || {}, appState.data.gate || {});
}

function getEffectiveIntervalMs() {
  return document.hidden ? Math.max(30000, appState.intervalMs) : appState.intervalMs;
}

function resetCountdown() {
  appState.nextRefreshInSec = Math.ceil(getEffectiveIntervalMs() / 1000);
  setCountdownText();
}

async function refresh(opts = {}) {
  const forceFull = !!opts.forceFull;
  const shouldFull = forceFull || appState.tick === 0 || (appState.tick % appState.fullRefreshEvery === 0);
  const mode = shouldFull ? 'full' : 'live';
  const endpoint = mode === 'full' ? '/api/pack/full?events=90' : '/api/pack/live?events=40';

  try {
    const pack = await get(endpoint);
    appState.lastMode = pack.mode || mode;
    mergePack(pack);
    renderAll();

    const modeText = appState.paused ? 'paused' : `auto ${appState.intervalMs / 1000}s`;
    setMeta(`Live • ${modeText} • low-load mode (full sync every ${appState.fullRefreshEvery * appState.intervalMs / 1000}s) • ${new Date().toLocaleString()}`);
    setLiveIndicator(true);
    setRefreshBadge();

    appState.tick += 1;
    resetCountdown();
  } catch (e) {
    const hint = TOKEN ? '' : ' Add ?token=... if token auth is enabled.';
    setMeta(`Dashboard error: ${e.message}.${hint}`, true);
    setLiveIndicator(false);
    setRefreshBadge();
  }
}

function applyRefreshTimer() {
  if (appState.timer) clearInterval(appState.timer);
  if (appState.paused) return;

  const ms = getEffectiveIntervalMs();
  appState.timer = setInterval(() => {
    refresh();
  }, ms);
  resetCountdown();
}

function setupCountdownTicker() {
  if (appState.countdownTimer) clearInterval(appState.countdownTimer);
  appState.countdownTimer = setInterval(() => {
    if (appState.paused) return;
    appState.nextRefreshInSec = Math.max(0, appState.nextRefreshInSec - 1);
    setCountdownText();
  }, 1000);
}

function setupControls() {
  const interval = document.getElementById('interval');
  const toggle = document.getElementById('toggleRefresh');
  const refreshNow = document.getElementById('refreshNow');

  interval.value = String(appState.intervalMs);
  interval.addEventListener('change', () => {
    appState.intervalMs = Number(interval.value) || 10000;
    applyRefreshTimer();
    refresh({ forceFull: true });
  });

  toggle.addEventListener('click', () => {
    appState.paused = !appState.paused;
    toggle.textContent = appState.paused ? 'Resume' : 'Pause';
    applyRefreshTimer();
    setRefreshBadge();
    setCountdownText();
  });

  refreshNow.addEventListener('click', () => refresh({ forceFull: true }));

  document.getElementById('modelSearch').addEventListener('input', () => {
    appState.modelPage = 1;
    renderModelsTable();
  });
  document.getElementById('providerFilter').addEventListener('change', () => {
    appState.modelPage = 1;
    renderModelsTable();
  });
  document.getElementById('modelPageSize').addEventListener('change', () => {
    appState.modelPage = 1;
    renderModelsTable();
  });
  document.getElementById('modelPrevPage').addEventListener('click', () => {
    if (appState.modelPage <= 1) return;
    appState.modelPage -= 1;
    renderModelsTable();
  });
  document.getElementById('modelNextPage').addEventListener('click', () => {
    appState.modelPage += 1;
    renderModelsTable();
  });

  document.getElementById('healthStatusFilter').addEventListener('change', () => renderHealthTable(appState.data.state));
  document.getElementById('healthLimit').addEventListener('change', () => renderHealthTable(appState.data.state));
  document.getElementById('healthFailFirst').addEventListener('change', () => renderHealthTable(appState.data.state));
  document.getElementById('healthSearch').addEventListener('input', () => renderHealthTable(appState.data.state));

  document.addEventListener('visibilitychange', () => {
    applyRefreshTimer();
    setRefreshBadge();
  });
}

setupControls();
setupCountdownTicker();
setRefreshBadge();
resetCountdown();
refresh({ forceFull: true });
applyRefreshTimer();
