const TOKEN = new URLSearchParams(location.search).get('token') || '';

const appState = {
  paused: false,
  intervalMs: 20000,
  timer: null,
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
  modelsRows: []
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
  document.getElementById('dailyUpdated').textContent = daily.updatedAt || '-';
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

  const filtered = appState.modelsRows.filter((r) => {
    if (provider !== 'all' && r.provider !== provider) return false;
    if (!q) return true;
    return `${r.provider} ${r.model}`.toLowerCase().includes(q);
  });

  tbody.innerHTML = '';
  filtered.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(r.provider)}</td>
      <td>${escapeHtml(r.model)}</td>
      <td>${escapeHtml(r.priority)}</td>
      <td>${escapeHtml(r.rpm)}</td>
      <td>${escapeHtml(r.tpm)}</td>
      <td>${r.enabled ? badge('enabled', 'ok') : badge('disabled', 'muted')}</td>
    `;
    tbody.appendChild(tr);
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="muted">No matching models.</td></tr>';
  }
}

function renderHealthTable(state = {}) {
  const statusFilter = document.getElementById('healthStatusFilter').value;
  const q = (document.getElementById('healthSearch').value || '').trim().toLowerCase();
  const tbody = document.querySelector('#healthTable tbody');

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
  }).sort((a, b) => String(b.checkedAt).localeCompare(String(a.checkedAt)));

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!q) return true;
    return `${r.provider} ${r.model} ${r.account}`.toLowerCase().includes(q);
  });

  tbody.innerHTML = '';
  filtered.slice(0, 150).forEach((r) => {
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

  if (!filtered.length) {
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

async function refresh() {
  try {
    const [summary, state, config, daily, gate, pipeline, policy, events] = await Promise.all([
      get('/api/summary'),
      get('/api/state'),
      get('/api/config'),
      get('/api/daily'),
      get('/api/gate'),
      get('/api/pipeline'),
      get('/api/policy'),
      get('/api/events?limit=100')
    ]);

    appState.data = { summary, state, config, daily, gate, pipeline, policy, events };
    appState.modelsRows = buildModelsRows(config);

    renderKpis(summary);
    renderPipeline(pipeline);
    renderDaily(daily, summary);

    syncProviderFilter(appState.modelsRows);
    renderModelsTable();
    renderHealthTable(state);
    renderGateTable(gate);
    renderPolicy(policy);
    renderEvents(events);
    renderRaw(state, summary, gate);

    const mode = appState.paused ? 'paused' : `auto ${appState.intervalMs / 1000}s`;
    setMeta(`Live • ${mode} • ${new Date().toLocaleString()}`);
  } catch (e) {
    const hint = TOKEN ? '' : ' Add ?token=... if token auth is enabled.';
    setMeta(`Dashboard error: ${e.message}.${hint}`, true);
  }
}

function applyRefreshTimer() {
  if (appState.timer) clearInterval(appState.timer);
  if (appState.paused) return;
  appState.timer = setInterval(refresh, appState.intervalMs);
}

function setupControls() {
  const interval = document.getElementById('interval');
  const toggle = document.getElementById('toggleRefresh');
  const refreshNow = document.getElementById('refreshNow');

  interval.value = String(appState.intervalMs);
  interval.addEventListener('change', () => {
    appState.intervalMs = Number(interval.value) || 20000;
    applyRefreshTimer();
    refresh();
  });

  toggle.addEventListener('click', () => {
    appState.paused = !appState.paused;
    toggle.textContent = appState.paused ? 'Resume' : 'Pause';
    applyRefreshTimer();
    refresh();
  });

  refreshNow.addEventListener('click', refresh);

  document.getElementById('modelSearch').addEventListener('input', renderModelsTable);
  document.getElementById('providerFilter').addEventListener('change', renderModelsTable);

  document.getElementById('healthStatusFilter').addEventListener('change', () => renderHealthTable(appState.data.state));
  document.getElementById('healthSearch').addEventListener('input', () => renderHealthTable(appState.data.state));
}

setupControls();
refresh();
applyRefreshTimer();
