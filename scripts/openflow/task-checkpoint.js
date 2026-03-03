#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_PATH = process.env.OPENFLOW_STATE_PATH || path.join(ROOT, 'config/openflow/runtime-state.json');
const TASK_DIR = process.env.OPENFLOW_TASK_DIR || path.join(path.dirname(STATE_PATH), 'tasks');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const CHECKPOINT_SUMMARY_MAX = Number(process.env.OPENFLOW_CHECKPOINT_SUMMARY_MAX || '220');
const CHECKPOINT_MIN_INTERVAL_SEC = Number(process.env.OPENFLOW_CHECKPOINT_MIN_INTERVAL_SEC || '1500'); // 25 min default for autosave economy
const CHECKPOINT_PROGRESS_MIN_DELTA = Number(process.env.OPENFLOW_CHECKPOINT_PROGRESS_MIN_DELTA || '12');
const CHECKPOINT_MAX_PER_TASK = Number(process.env.OPENFLOW_CHECKPOINT_MAX_PER_TASK || '30');
const CHECKPOINT_MILESTONE_REGEX = process.env.OPENFLOW_CHECKPOINT_MILESTONE_REGEX || '(milestone|phase|completed|done|final|handoff|integrated|validated|shipped|report ready|checkpoint)';
const MILESTONE_RE = new RegExp(CHECKPOINT_MILESTONE_REGEX, 'i');

function normalizeSummary(s) {
  const clean = String(s || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length <= CHECKPOINT_SUMMARY_MAX ? clean : `${clean.slice(0, CHECKPOINT_SUMMARY_MAX)}…`;
}

function trimCheckpoints(checkpoints, maxCount = CHECKPOINT_MAX_PER_TASK) {
  if (!Array.isArray(checkpoints) || checkpoints.length <= maxCount) return checkpoints || [];

  const start = checkpoints.find((x) => x.type === 'start') || checkpoints[0];
  const terminal = [...checkpoints].reverse().find((x) => x.type === 'complete' || x.type === 'fail') || null;
  const excluded = new Set([start, terminal].filter(Boolean));
  const middle = checkpoints.filter((x) => !excluded.has(x));

  const budget = Math.max(0, maxCount - (terminal ? 2 : 1));
  const keptMiddle = middle.slice(-budget);

  const out = [start, ...keptMiddle];
  if (terminal && terminal !== start) out.push(terminal);
  return out;
}

function parseTaskRef(ref, state) {
  if (!ref || ref === 'active') return state.guard?.activeTask?.taskId || null;
  if (ref.startsWith('tsktok_')) {
    const raw = ref.slice('tsktok_'.length);
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const obj = JSON.parse(decoded);
    return obj.taskId || null;
  }
  return ref;
}

function taskFile(taskId) {
  return path.join(TASK_DIR, `${taskId}.json`);
}

function loadTask(taskId) {
  const p = taskFile(taskId);
  if (!fs.existsSync(p)) throw new Error(`Task not found: ${taskId}`);
  return readJson(p);
}

function saveTask(task) {
  ensureDir(TASK_DIR);
  writeJson(taskFile(task.taskId), task);
}

function makeToken(taskId) {
  const payload = Buffer.from(JSON.stringify({ taskId, iat: nowIso() }), 'utf8').toString('base64url');
  return `tsktok_${payload}`;
}

function commandStart() {
  const state = readJson(STATE_PATH);
  const name = arg('name', 'subagent-task');
  const lockMinutes = Number(arg('lockMinutes', '90'));
  const note = arg('note', null);

  if (!Number.isFinite(lockMinutes) || lockMinutes <= 0) {
    throw new Error('lockMinutes must be > 0');
  }

  const stamp = new Date();
  const taskId = `task_${stamp.toISOString().replace(/[-:.TZ]/g, '')}_${Math.random().toString(36).slice(2, 8)}`;
  const token = makeToken(taskId);
  const lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();

  const task = {
    taskId,
    token,
    name,
    status: 'running',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lockMinutes,
    lockedUntil,
    routeAtStart: state.active || null,
    note,
    checkpointPolicy: {
      summaryMaxChars: CHECKPOINT_SUMMARY_MAX,
      minIntervalSec: CHECKPOINT_MIN_INTERVAL_SEC,
      progressMinDelta: CHECKPOINT_PROGRESS_MIN_DELTA,
      maxPerTask: CHECKPOINT_MAX_PER_TASK,
      milestoneRegex: CHECKPOINT_MILESTONE_REGEX
    },
    checkpoints: [
      {
        at: nowIso(),
        type: 'start',
        summary: `Task started: ${name}`,
        route: state.active || null,
        progress: 0
      }
    ]
  };

  saveTask(task);

  state.guard = state.guard || {};
  state.guard.locked = true;
  state.guard.lockedAt = nowIso();
  state.guard.lockedUntil = lockedUntil;
  state.guard.reason = `task:${taskId}:${name}`;
  state.guard.activeTask = {
    taskId,
    token,
    name,
    startedAt: nowIso(),
    lastCheckpointAt: nowIso()
  };
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);

  console.log(`taskId=${taskId}`);
  console.log(`taskToken=${token}`);
  console.log(`lockedUntil=${lockedUntil}`);
}

function commandCheckpoint() {
  const state = readJson(STATE_PATH);
  const ref = arg('task', 'active');
  const taskId = parseTaskRef(ref, state);
  if (!taskId) throw new Error('No active task. Pass --task <taskId|token>.');

  const summaryRaw = arg('summary');
  const summary = normalizeSummary(summaryRaw);
  if (!summary) throw new Error('Missing --summary');

  const force = hasFlag('force');
  const progressRaw = arg('progress', null);
  const progress = progressRaw == null ? null : Number(progressRaw);
  const metaJson = arg('metaJson', null);
  let meta = null;
  if (metaJson) {
    try {
      meta = JSON.parse(metaJson);
    } catch {
      throw new Error('metaJson must be valid JSON');
    }
  }

  const task = loadTask(taskId);
  task.checkpoints = task.checkpoints || [];
  const last = [...task.checkpoints].reverse().find((x) => x.type === 'checkpoint' || x.type === 'start') || null;
  const milestoneHit = MILESTONE_RE.test(summary);

  if (!force && !milestoneHit && last) {
    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(last.at).getTime()) / 1000));
    const lastProgress = Number.isFinite(Number(last.progress)) ? Number(last.progress) : null;
    const currProgress = Number.isFinite(progress) ? Number(progress) : null;
    const progressDelta = lastProgress != null && currProgress != null ? Math.abs(currProgress - lastProgress) : null;

    const tooSoon = elapsedSec < CHECKPOINT_MIN_INTERVAL_SEC;
    const sameSummary = (last.summary || '') === summary;
    const tinyProgress = progressDelta != null && progressDelta < CHECKPOINT_PROGRESS_MIN_DELTA;

    if (tooSoon && (sameSummary || tinyProgress)) {
      console.log(`checkpoint_skipped taskId=${taskId} reason=debounce elapsed=${elapsedSec}s`);
      return;
    }
  }

  task.checkpoints.push({
    at: nowIso(),
    type: 'checkpoint',
    summary,
    milestone: milestoneHit || false,
    progress: Number.isFinite(progress) ? progress : null,
    route: state.active || null,
    guardLockedUntil: state.guard?.lockedUntil || null,
    meta
  });
  task.checkpoints = trimCheckpoints(task.checkpoints);
  task.updatedAt = nowIso();
  saveTask(task);

  state.guard = state.guard || {};
  if (state.guard.activeTask && state.guard.activeTask.taskId === taskId) {
    state.guard.activeTask.lastCheckpointAt = nowIso();
  }
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);

  console.log(`checkpoint_saved taskId=${taskId}`);
}

function commandComplete() {
  const state = readJson(STATE_PATH);
  const ref = arg('task', 'active');
  const taskId = parseTaskRef(ref, state);
  if (!taskId) throw new Error('No active task. Pass --task <taskId|token>.');

  const summary = normalizeSummary(arg('summary', 'Task completed'));
  const task = loadTask(taskId);
  task.checkpoints = task.checkpoints || [];
  task.checkpoints.push({
    at: nowIso(),
    type: 'complete',
    summary,
    route: state.active || null
  });
  task.checkpoints = trimCheckpoints(task.checkpoints);
  task.status = 'completed';
  task.completedAt = nowIso();
  task.updatedAt = nowIso();
  saveTask(task);

  state.guard = state.guard || {};
  state.guard.locked = false;
  state.guard.lockedUntil = null;
  state.guard.reason = null;
  state.guard.unlockedAt = nowIso();
  if (state.guard.activeTask?.taskId === taskId) {
    state.guard.activeTask = null;
  }
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);

  console.log(`task_completed taskId=${taskId}`);
}

function commandFail() {
  const state = readJson(STATE_PATH);
  const ref = arg('task', 'active');
  const taskId = parseTaskRef(ref, state);
  if (!taskId) throw new Error('No active task. Pass --task <taskId|token>.');

  const reason = normalizeSummary(arg('reason', 'Task failed'));
  const task = loadTask(taskId);
  task.checkpoints = task.checkpoints || [];
  task.checkpoints.push({
    at: nowIso(),
    type: 'fail',
    summary: reason,
    route: state.active || null
  });
  task.checkpoints = trimCheckpoints(task.checkpoints);
  task.status = 'failed';
  task.failedAt = nowIso();
  task.updatedAt = nowIso();
  saveTask(task);

  state.guard = state.guard || {};
  if (state.guard.activeTask?.taskId === taskId) {
    state.guard.activeTask = null;
  }
  state.guard.locked = false;
  state.guard.lockedUntil = null;
  state.guard.reason = null;
  state.guard.unlockedAt = nowIso();
  state.updatedAt = nowIso();
  writeJson(STATE_PATH, state);

  console.log(`task_failed taskId=${taskId}`);
}

function commandShow() {
  const state = readJson(STATE_PATH);
  const ref = arg('task', 'active');
  const taskId = parseTaskRef(ref, state);
  if (!taskId) throw new Error('No active task. Pass --task <taskId|token>.');
  const task = loadTask(taskId);
  console.log(JSON.stringify(task, null, 2));
}

function commandList() {
  ensureDir(TASK_DIR);
  const limit = Number(arg('limit', '20'));
  const files = fs.readdirSync(TASK_DIR).filter((x) => x.endsWith('.json'));
  const rows = files.map((f) => readJson(path.join(TASK_DIR, f))).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  rows.slice(0, limit).forEach((t) => {
    console.log(`${t.taskId} :: ${t.status} :: ${t.name} :: updated=${t.updatedAt}`);
  });
}

function commandResume() {
  const state = readJson(STATE_PATH);
  const ref = arg('task', 'active');
  const taskId = parseTaskRef(ref, state);
  if (!taskId) throw new Error('No active task. Pass --task <taskId|token>.');
  const task = loadTask(taskId);
  const cps = task.checkpoints || [];
  const last = cps[cps.length - 1] || null;

  console.log(`taskId=${task.taskId}`);
  console.log(`status=${task.status}`);
  console.log(`name=${task.name}`);
  console.log(`token=${task.token}`);
  console.log(`lastCheckpointAt=${last?.at || 'n/a'}`);
  console.log('---RESUME_CONTEXT_START---');
  console.log(`Task: ${task.name}`);
  console.log(`Status: ${task.status}`);
  if (last) {
    console.log(`Latest checkpoint: ${last.summary}`);
    if (last.progress != null) console.log(`Progress: ${last.progress}%`);
    if (last.route) console.log(`Last route: ${last.route.provider}/${last.route.model}/${last.route.account}`);
  }
  console.log('Continue from this checkpoint. Do not repeat completed steps.');
  console.log('---RESUME_CONTEXT_END---');
}

function commandPrune() {
  ensureDir(TASK_DIR);
  const keepDays = Number(arg('keepDays', '14'));
  if (!Number.isFinite(keepDays) || keepDays < 1) throw new Error('keepDays must be >= 1');

  const now = Date.now();
  const files = fs.readdirSync(TASK_DIR).filter((x) => x.endsWith('.json'));
  let removed = 0;

  for (const f of files) {
    const p = path.join(TASK_DIR, f);
    const task = readJson(p);
    const status = task.status || 'unknown';
    if (status === 'running') continue;

    const ts = new Date(task.updatedAt || task.completedAt || task.failedAt || task.createdAt || 0).getTime();
    if (!Number.isFinite(ts)) continue;
    const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
    if (ageDays >= keepDays) {
      fs.unlinkSync(p);
      removed += 1;
    }
  }

  console.log(`pruned=${removed}`);
}

function commandStats() {
  ensureDir(TASK_DIR);
  const files = fs.readdirSync(TASK_DIR).filter((x) => x.endsWith('.json'));
  let total = 0;
  const byStatus = {};
  let checkpoints = 0;

  for (const f of files) {
    const t = readJson(path.join(TASK_DIR, f));
    total += 1;
    const s = t.status || 'unknown';
    byStatus[s] = (byStatus[s] || 0) + 1;
    checkpoints += Array.isArray(t.checkpoints) ? t.checkpoints.length : 0;
  }

  console.log(JSON.stringify({ totalTasks: total, byStatus, totalCheckpoints: checkpoints }, null, 2));
}

function main() {
  const cmd = process.argv[2];
  ensureDir(TASK_DIR);

  switch (cmd) {
    case 'start':
      commandStart();
      break;
    case 'checkpoint':
      commandCheckpoint();
      break;
    case 'complete':
      commandComplete();
      break;
    case 'fail':
      commandFail();
      break;
    case 'show':
      commandShow();
      break;
    case 'list':
      commandList();
      break;
    case 'resume':
      commandResume();
      break;
    case 'prune':
      commandPrune();
      break;
    case 'stats':
      commandStats();
      break;
    default:
      console.error('Usage: start|checkpoint|complete|fail|show|list|resume|prune|stats [flags]');
      process.exit(2);
  }
}

try {
  main();
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
