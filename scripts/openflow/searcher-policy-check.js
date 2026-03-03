#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const POLICY_PATH = path.join(ROOT, 'config/openflow/subagent/searcher-policy.json');
const CATALOG_PATH = path.join(ROOT, 'config/openflow/subagent/free-model-catalog.json');
const REPORT_PATH = path.join(ROOT, 'agents/searcher/reports/free-models-latest.md');
const LOG_PATH = path.join(ROOT, 'logs/searcher-policy.log');

function readJson(p, fallback = null){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fallback; } }
function appendLog(line){ fs.mkdirSync(path.dirname(LOG_PATH), {recursive:true}); fs.appendFileSync(LOG_PATH, line + '\n'); }

function hostOf(u){ try { return new URL(u).hostname.toLowerCase(); } catch { return null; } }

function isAllowedHost(host, allow, block){
  if (!host) return false;
  if (block.includes(host)) return false;
  return allow.includes(host) || allow.some((d)=>host.endsWith('.'+d));
}

function main(){
  const policy = readJson(POLICY_PATH, null);
  if (!policy) throw new Error('missing searcher-policy.json');

  const catalog = readJson(CATALOG_PATH, {items:[]});
  const report = fs.existsSync(REPORT_PATH) ? fs.readFileSync(REPORT_PATH, 'utf8').toLowerCase() : '';

  const allow = (policy.allowedDomains || []).map((x)=>String(x).toLowerCase());
  const block = (policy.blockedDomains || []).map((x)=>String(x).toLowerCase());
  const badKeywords = (policy.forbiddenKeywords || []).map((x)=>String(x).toLowerCase());

  const violations = [];

  for (const item of catalog.items || []) {
    const ev = item.evidence || [];
    if (ev.length > (policy.maxEvidenceLinksPerItem || 5)) {
      violations.push(`evidence-overflow model=${item.model} count=${ev.length}`);
    }

    for (const e of ev) {
      const h = hostOf(e.url);
      if (!isAllowedHost(h, allow, block)) {
        violations.push(`domain-not-allowed model=${item.model} host=${h||'invalid'} url=${e.url}`);
      }
    }

    const blob = `${item.provider} ${item.model} ${item.apiAccess || ''}`.toLowerCase();
    for (const k of badKeywords) {
      if (blob.includes(k)) violations.push(`forbidden-keyword-in-catalog model=${item.model} keyword=${k}`);
    }
  }

  for (const k of badKeywords) {
    if (report.includes(k)) violations.push(`forbidden-keyword-in-report keyword=${k}`);
  }

  const ts = new Date().toISOString();
  if (violations.length) {
    appendLog(`${ts} POLICY_FAIL count=${violations.length}`);
    for (const v of violations) appendLog(`${ts} ${v}`);
    console.error(JSON.stringify({ ok:false, violations }, null, 2));
    process.exit(1);
  }

  appendLog(`${ts} POLICY_OK`);
  console.log(JSON.stringify({ ok:true, checkedAt: ts }, null, 2));
}

main();
