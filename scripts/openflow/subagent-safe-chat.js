#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const ROUTER = path.join(ROOT, 'scripts/openflow/subagent-router.sh');
const CONTROLLER = path.join(ROOT, 'scripts/openflow/subagent-controller.sh');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function estimateTokens(text, maxOut) {
  const inTok = Math.ceil((text || '').length / 4);
  return Math.max(1, inTok + maxOut);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return r;
}

function parseJsonMaybe(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function main() {
  const message = arg('message');
  const maxTokens = Number(arg('maxTokens', '256'));
  const temperature = Number(arg('temperature', '0'));
  const worker = arg('worker', null);
  const raw = hasFlag('raw');

  if (!message) {
    console.error('Usage: node scripts/openflow/subagent-safe-chat.js --message "..." [--maxTokens 256] [--temperature 0] [--worker <role-or-agent>] [--raw]');
    process.exit(2);
  }

  const estimatedTokens = estimateTokens(message, maxTokens);

  const acquireArgs = ['acquire-route', '--needTokens', String(estimatedTokens), '--needRequests', '1'];
  if (worker) acquireArgs.push('--worker', worker);
  const acquire = run(ROUTER, acquireArgs);
  const acquireJson = parseJsonMaybe((acquire.stdout || '').trim());

  if (acquire.status !== 0 || !acquireJson?.ok) {
    console.error(acquire.stdout || acquire.stderr || 'Failed to acquire route');
    process.exit(1);
  }

  const route = acquireJson.route;
  const apiKey = process.env[route.authEnv];
  if (!apiKey) {
    console.error(`Missing env var ${route.authEnv}`);
    process.exit(1);
  }

  const res = await fetch(`${route.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: route.model,
      messages: [{ role: 'user', content: message }],
      max_tokens: maxTokens,
      max_completion_tokens: maxTokens,
      temperature
    })
  });

  const text = await res.text();
  const body = parseJsonMaybe(text) || { raw: text };

  if (!res.ok) {
    // mark failure for current route so selector can avoid broken slot
    run(CONTROLLER, ['mark-failure', route.provider, route.model, route.account, `HTTP ${res.status} from safe-chat`]);
    console.error(`HTTP ${res.status}`);
    console.error(text);
    process.exit(1);
  }

  const actualTokens = Number(body?.usage?.total_tokens || estimatedTokens);
  run(ROUTER, [
    'settle',
    '--provider', route.provider,
    '--model', route.model,
    '--account', route.account,
    '--estimatedTokens', String(estimatedTokens),
    '--actualTokens', String(actualTokens)
  ]);

  if (raw) {
    console.log(JSON.stringify({ route, body }, null, 2));
    return;
  }

  const out = body?.choices?.[0]?.message?.content ?? text;
  console.log(out);
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
