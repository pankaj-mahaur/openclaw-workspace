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
- OpenClaw tooling preference: keep coding access unlocked by default (`tools.profile: coding`); do not switch to locked/messaging profile unless the user explicitly reconfirms.
- For **AyurNod** work: always follow a professional and organized workflow (clear plan, clean branch hygiene, meaningful commits, orderly execution).
- User preference (AyurNod coding): do **not** make code changes without explicit permission.
- User workflow preference: in longer implementation sprints, do commit+push checkpoints before moving to the next phase.
- Technical constraint to remember: browser mic/speech recognition on VPS requires HTTPS (or true localhost); plain HTTP on public IP gets blocked by secure-context rules.
- Reliability pattern for chat: keep graceful fallback behavior when LLM provider/auth fails to avoid user-facing 500 errors.
- Current AyurNod UI direction preference: keep **dark mode as default**, use a warm off-white light theme option, and keep gradients/glass effects very subtle so health-trust clarity remains primary.
- Deployment/runtime note: AyurNod website/backend are now configured for PM2-managed production processes on VPS (`ecosystem.config.cjs`), with startup persistence enabled via systemd (`pm2-root`).
- Supplements product strategy for AyurNod: affiliate-first marketplace model (multi-provider offers + partner checkout redirects), not direct on-site payment checkout.
- Supplements Phase 2 status: implemented backend redirect tracking + provider/product analytics endpoints and wired website checkout/supplement links through tracked affiliate redirects.
- Next affiliate milestone context: India-first INR pricing and live provider feeds are now scaffolded (React Query + backend sync service), pending provider credentials + priority + optimization rule from user.
- Current phase execution state: core Phase 1 implemented; Phase 2 conversion/ranking improvements plus Phase 3 blog-detail engine and Phase 4 My Plan strip baseline shipped (commit `a2c7e9c`).
- Current execution mode preference: implement in clear step-by-step chunks with checkpoint commits and pushes.
- New durable workflow preference (2026-03-04): for coding-heavy tasks, run implementation primarily via `pi` (`@mariozechner/pi-coding-agent`) on the VPS, ideally from the project terminal in VS Code, to reduce OpenClaw token burn; Paplu should orchestrate, delegate heavy coding there, then report concise checkpoints/results.
- Temporary override (2026-03-05): user asked to keep `pi` aside for now and do coding directly with Paplu; follow direct-coding mode until user asks to resume `pi` delegation.
- Auth/runtime note: `pi` is installed globally and Google Antigravity OAuth is configured on this VPS (`google-antigravity`), so delegated coding can start immediately.
- Current AyurvedaNod execution focus (as of 2026-03-02): mobile app UI/UX polish and theme stabilization for testing readiness on branch `mobile-ui-and-ux-and-other-functionalities`.
- Latest mobile checkpoints shipped and pushed for testing: `30f5437` (tokenized theming + chat TS cleanup) and `13c4551` (full light/dark rollout + nav polish).
