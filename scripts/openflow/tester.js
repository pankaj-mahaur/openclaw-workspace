#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG_PATH = process.env.OPENFLOW_CONFIG_PATH || path.join(ROOT, 'config/openflow/master-config.json');
const STATE_PATH = process.env.OPENFLOW_STATE_PATH || path.join(ROOT, 'config/openflow/runtime-state.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function pickRateLimitHeaders(headers) {
  const out = {};
  const wanted = [
    'retry-after',
    'x-ratelimit-limit-requests',
    'x-ratelimit-limit-requests-day',
    'x-ratelimit-limit-requests-minute',
    'x-ratelimit-limit-tokens',
    'x-ratelimit-limit-tokens-minute',
    'x-ratelimit-remaining-requests',
    'x-ratelimit-remaining-requests-day',
    'x-ratelimit-remaining-requests-minute',
    'x-ratelimit-remaining-tokens',
    'x-ratelimit-remaining-tokens-minute',
    'x-ratelimit-reset-requests',
    'x-ratelimit-reset-requests-day',
    'x-ratelimit-reset-tokens',
    'x-ratelimit-reset-tokens-minute'
  ];

  for (const k of wanted) {
    const v = headers.get(k);
    if (v != null) out[k] = v;
  }
  return out;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function pingOpenAICompatibleModels(baseUrl, key, timeoutMs) {
  const res = await fetchWithTimeout(`${baseUrl}/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  }, timeoutMs);
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    body: text.slice(0, 2000),
    rateLimit: pickRateLimitHeaders(res.headers)
  };
}

async function pingOpenAICompatibleChat(baseUrl, key, modelId, timeoutMs) {
  const headers = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  const attempts = [
    {
      model: modelId,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
      max_completion_tokens: 8,
      temperature: 0
    },
    {
      model: modelId,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
      max_tokens: 8,
      temperature: 0
    }
  ];

  let last = null;

  for (const payload of attempts) {
    const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    }, timeoutMs);

    const text = await res.text();
    last = {
      ok: res.ok,
      status: res.status,
      body: text.slice(0, 2000),
      rateLimit: pickRateLimitHeaders(res.headers)
    };

    if (res.ok) break;
    if (res.status !== 400) break;
  }

  return last;
}

async function pingAnthropic(baseUrl, key, timeoutMs) {
  const res = await fetchWithTimeout(`${baseUrl}/models`, {
    method: 'GET',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }
  }, timeoutMs);

  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    body: text.slice(0, 2000),
    rateLimit: pickRateLimitHeaders(res.headers)
  };
}

async function main() {
  const providerId = arg('provider');
  const modelId = arg('model');
  const accountId = arg('account');
  const probe = arg('probe', 'models'); // models | chat

  if (!providerId || !modelId || !accountId) {
    console.error('Usage: node scripts/openflow/tester.js --provider <id> --model <id> --account <id> [--probe models|chat]');
    process.exit(2);
  }

  const cfg = readJson(CFG_PATH);
  const state = readJson(STATE_PATH);

  const provider = (cfg.providers || []).find((p) => p.id === providerId);
  if (!provider) throw new Error(`Provider not found: ${providerId}`);

  const model = (provider.models || []).find((m) => m.id === modelId);
  if (!model) throw new Error(`Model not found: ${modelId}`);

  const account = (provider.accounts || []).find((a) => a.id === accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);

  const genericEnv = `${String(providerId || '').toUpperCase()}_API_KEY`;
  const key = process.env[account.authEnv] || process.env[genericEnv] || null;
  if (!key) {
    throw new Error(`Missing env var ${account.authEnv} (or fallback ${genericEnv})`);
  }

  const timeoutMs = cfg.tester?.requestTimeoutMs || 30000;
  let result;

  if (provider.apiStyle === 'openai-compatible') {
    if (probe === 'chat') {
      result = await pingOpenAICompatibleChat(provider.baseUrl, key, modelId, timeoutMs);
    } else {
      result = await pingOpenAICompatibleModels(provider.baseUrl, key, timeoutMs);
    }
  } else if (provider.apiStyle === 'anthropic') {
    result = await pingAnthropic(provider.baseUrl, key, timeoutMs);
  } else {
    throw new Error(`Unsupported apiStyle for tester: ${provider.apiStyle}`);
  }

  const healthKey = `${providerId}:${modelId}:${accountId}`;
  state.health = state.health || {};
  state.tests = state.tests || [];

  state.health[healthKey] = {
    ok: !!result.ok,
    checkedAt: nowIso(),
    status: result.status,
    probe,
    rateLimit: result.rateLimit || {}
  };

  state.tests.unshift({
    provider: providerId,
    model: modelId,
    account: accountId,
    ok: !!result.ok,
    status: result.status,
    probe,
    checkedAt: nowIso(),
    rateLimit: result.rateLimit || {},
    sample: result.body
  });

  state.tests = state.tests.slice(0, 400);
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);

  if (!result.ok) {
    console.error(`FAIL ${result.status} :: ${healthKey} :: probe=${probe}`);
    console.error(result.body);
    process.exit(1);
  }

  console.log(`PASS ${result.status} :: ${healthKey} :: probe=${probe}`);
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
