# MEMORY.md — Long-Term Memory

## Scope (Important)
- This file is for **long-term, high-value memory only**.
- Do **not** store daily logs here.
- Day-level details belong in `memory/YYYY-MM-DD.md`.

## People
- Human: **PhanX** (from local tools/profile notes).
- Assistant identity in practice: **Paplu**.

## Infrastructure & Workspace
- Primary workspace repo: `git@github.com:pankaj-mahaur/openclaw-workspace.git`.
- Workspace host SSH key currently used for GitHub: `~/.ssh/id_openclaw_workspace` (ed25519).
- SSH config `Host github.com` points to `id_openclaw_workspace`.

## Projects
- Main active project: **AyurNod** (AI health translator app), maintained in a separate repo.

## Preferences / Operating Notes
- Keep workspace continuity in files (`memory/YYYY-MM-DD.md` + this file).
- Enforce strict memory separation:
  - `memory/YYYY-MM-DD.md` = daily logs
  - `MEMORY.md` = long-term, high-value memory only
- Use careful commits with clear messages before pushing.
- For **AyurNod** work: always follow a professional and organized workflow (clear plan, clean branch hygiene, meaningful commits, orderly execution).
- User preference (AyurNod coding): do **not** make code changes without explicit permission.
- User workflow preference: in longer implementation sprints, do commit+push checkpoints before moving to the next phase.
- Technical constraint to remember: browser mic/speech recognition on VPS requires HTTPS (or true localhost); plain HTTP on public IP gets blocked by secure-context rules.
- Reliability pattern for chat: keep graceful fallback behavior when LLM provider/auth fails to avoid user-facing 500 errors.
- Current AyurNod UI direction preference: keep **dark mode as default**, use a warm off-white light theme option, and keep gradients/glass effects very subtle so health-trust clarity remains primary.
- Deployment/runtime note: AyurNod website/backend are now configured for PM2-managed production processes on VPS (`ecosystem.config.cjs`), with startup persistence enabled via systemd (`pm2-root`).
- Supplements product strategy for AyurNod: affiliate-first marketplace model (multi-provider offers + partner checkout redirects), not direct on-site payment checkout.
- Supplements Phase 2 status: implemented backend redirect tracking + provider/product analytics endpoints and wired website checkout/supplement links through tracked affiliate redirects.
