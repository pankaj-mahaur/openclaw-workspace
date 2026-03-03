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

async function probeOpenAICompatible(provider, model, key, timeoutMs) {
  const attempts = [
    {
      model: model.id,
      messages: [{ role: 'user', content: 'ping' }],
      max_completion_tokens: 1,
      temperature: 0
    },
    {
      model: model.id,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      temperature: 0
    }
  ];

  let last = null;

  for (const payload of attempts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const text = await res.text();
      last = {
        ok: res.ok,
        status: res.status,
        body: text.slice(0, 1200),
        rateLimit: pickRateLimitHeaders(res.headers)
      };

      if (res.ok) break;
      if (res.status !== 400) break;
    } finally {
      clearTimeout(timer);
    }
  }

  return last;
}

async function main() {
  const providerId = arg('provider');
  const modelId = arg('model');
  const accountId = arg('account');

  if (!providerId || !modelId || !accountId) {
    console.error('Usage: node scripts/openflow/rate-probe.js --provider <id> --model <id> --account <id>');
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

  const key = process.env[account.authEnv];
  if (!key) throw new Error(`Missing env var ${account.authEnv}`);

  const timeoutMs = cfg.tester?.requestTimeoutMs || 30000;
  let result;

  if (provider.apiStyle === 'openai-compatible') {
    result = await probeOpenAICompatible(provider, model, key, timeoutMs);
  } else {
    throw new Error(`rate-probe currently supports openai-compatible providers only: ${provider.apiStyle}`);
  }

  const healthKey = `${providerId}:${modelId}:${accountId}`;
  state.health = state.health || {};
  state.tests = state.tests || [];

  state.health[healthKey] = {
    ...(state.health[healthKey] || {}),
    ok: !!result.ok,
    checkedAt: nowIso(),
    status: result.status,
    rateLimit: result.rateLimit || {}
  };

  state.tests.unshift({
    provider: providerId,
    model: modelId,
    account: accountId,
    probeType: 'rate-limit',
    ok: !!result.ok,
    status: result.status,
    checkedAt: nowIso(),
    rateLimit: result.rateLimit || {},
    sample: result.body
  });

  state.tests = state.tests.slice(0, 200);
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);

  if (!result.ok) {
    console.error(`FAIL ${result.status} :: ${healthKey}`);
    console.error(result.body);
    process.exit(1);
  }

  console.log(`PASS ${result.status} :: ${healthKey}`);
  console.log(JSON.stringify(result.rateLimit || {}, null, 2));
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
