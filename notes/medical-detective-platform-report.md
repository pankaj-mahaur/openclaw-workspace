# Ayurnod / Medical Detective Platform — Unified MVP Execution Plan (Merged)

_Source merge date: 2026-02-14 (from both user reports)_

## 1) Strategic Direction (What we’re building)
Build **Phase-1 as an AI-powered patient education product** (not diagnosis/prescription):
- Working name: **Manual AI Report Detective / Ayurnod AI Health Translator**
- Core flow: **symptom input → guided manual lab entry → contextual explanation → health memory storage**
- Positioning: **“Your AI Health Translator”** / **“Body Pattern Intelligence”**
- Explicit boundary: educational guidance only, with clear escalation to doctors where needed.

This preserves long-term vision while removing initial dependency on doctor network onboarding.

---

## 2) Founder Constraints & Operating Reality
- **Budget:** ₹50,000 total
- **Timeline:** 30 days to prototype
- **Team:** solo founder-dev
- **Stack background:** Next.js + Tailwind; moving to React Native (Expo)

### Budget strategy (practical split)
- API inference: ~₹20,000 (40%)
- Hosting/DB/infra scaling: ~₹12,500 (25%)
- Compliance/legal baseline: ~₹10,000 (20%)
- Contingency: ~₹7,500 (15%)

### Why API-first now
Self-hosted GPUs are too expensive/risky at this stage. API-first gives predictable burn and faster shipping. Move to self-hosting later only when utilization justifies it.

---

## 3) Why the Pivot Was Necessary
Original doctor-first approach had blocking dependencies:
1. NMC/state verification timelines
2. Legal contracts + liability structures
3. QA training + operational onboarding
4. Marketplace cold-start (no users ↔ no doctors)

**Conclusion:** doctor integration is phase-2+, not phase-1 critical path.

---

## 4) Phase Architecture (Unified)

## Phase 1 (Months 0–2): Foundation / Education Layer
Deliver immediate clarity on reports without doctor wait times.

### Core user experience
1. User enters symptoms (text/voice)
2. AI asks targeted follow-ups
3. AI requests relevant lab parameters (manual entry)
4. AI explains results with context (non-diagnostic)
5. Data saved in health memory with trend preview

### Why manual entry is strategic
- Better data confidence (user-verified)
- Better engagement and health literacy
- Avoid OCR complexity and errors
- Cleaner compliance posture for MVP

### Phase-1 value outputs
- Parameter explanations in plain language (Hindi/English)
- Symptom + lab contextual interpretation
- Clear next-step guidance (routine / appointment / urgent)
- Weekly insights + trend summaries for retention

## Phase 2 (Months 3–6): Intelligence Layer
- Optional paid doctor verification (24h turnaround)
- Wearables integration (HealthKit/Health Connect)
- Expanded signal quality and cross-domain correlations

## Phase 3 (Months 6–12): Proactive Engine / Health OS
- Personal baseline deviation alerts
- Predictive trend detection
- Subscription monetization via Health Memory Vault + chronic programs

---

## 5) Product Differentiation
Compared to OCR-only tools and generic symptom checkers:
- **Conversation-first, not upload-first**
- **Symptom + lab unified context**
- **India-first ranges/language/cultural context**
- **Longitudinal memory moat**

This creates compounding advantage over time via personalized baselines and trust.

---

## 6) Technical Architecture (Merged)

## Frontend
- **React Native + Expo + TypeScript + NativeWind**
- Key screens:
  - Symptom Intake
  - Guided Lab Entry
  - AI Conversation Interface
  - Results Dashboard (layered depth)
- State: **Zustand**
- Persistence: **AsyncStorage**
- Realtime sync: **Supabase Realtime**
- Localization: Hindi + English
- Accessibility: font scaling, color-safe UI, voice input

## Backend
- **FastAPI + LangGraph state machine**
- Workflow nodes:
  1. intake_node
  2. parameter_selection_node
  3. entry_guidance_node
  4. validation_node
  5. explanation_node
  6. safety_review_node
- Streaming responses via SSE for low perceived latency.

## AI model strategy
- Primary: **DeepSeek-R1** for complex multi-parameter reasoning
- Secondary: **Llama-3.1-8B** for standard explanations
- Fallback: smaller quantized model for low-latency/common paths
- **Aggressive caching target:** 60–70% hits

## Data layer (Supabase/Postgres)
Core tables:
- `patients`
- `symptom_sessions`
- `lab_values`
- `ai_explanations`
- `longitudinal_observations`

Principles:
- Row-level security
- Temporal/provenance tracking
- Versioned AI outputs
- Future-ready schema for doctor verification + subscriptions

---

## 7) Safety, Accuracy, Compliance

## AI safety controls
- Structured outputs (Pydantic enforced)
- Required disclaimer + confidence score
- Diagnostic language filtering
- Low-confidence conservative routing
- Emergency pathways bypass generative explanation

## Emergency trigger classes
- Critical symptoms (e.g., chest pain with radiation, severe dyspnea, altered consciousness)
- Critical lab thresholds (e.g., extreme glucose/electrolytes/hemoglobin)
- Concerning combinations → same-day care recommendation

## Regulatory posture (India)
- Educational positioning under Telemedicine constraints
- No AI prescriptions in phase-1
- DPDP-aligned consent, minimization, retention, revocation
- India-region data hosting preference and audit trails

---

## 8) Retention System (Important for manual logging)
To avoid churn after week 2–3:
- Weekly AI summary (what improved/declined + top actions)
- Personal baseline model:
  - 7-day rolling avg (responsive)
  - 30-day baseline (stable)
- Behavioral correlations (sleep↔energy, stress↔mood, etc.)
- Deviation-based health score (personal, not generic benchmark)

---

## 9) Business Model (Unified)

## Phase 1 revenue stance
- Free core education + trust + data accumulation

## Phase 2
- Doctor verification add-on: ₹199–₹499/case (indicative split 70/30 doctor/platform)
- Optional affiliate layer only with clear disclosure and strict separation

## Phase 3
- Health Memory Vault: ~₹199/month or ~₹1,999/year
- Condition programs: ₹299–₹499/month
- B2B employer wellness (privacy-preserving aggregated insights)

---

## 10) 30-Day Sprint Plan

### Week 1 — Foundation
- Expo project setup
- Supabase schema + auth
- Profile + language toggle
- Symptom intake screen

### Week 2 — AI integration
- LangGraph flow wiring
- DeepSeek/Llama integration
- Streaming + validation
- Guided lab entry forms (top parameters)

### Week 3 — Core UX + safety
- Results dashboard (layered explanation)
- Emergency rule system
- Health memory persistence + trend preview

### Week 4 — Hardening + beta
- Testing with target users
- Disclaimer/privacy/terms compliance pass
- Caching + performance + cost optimization
- Closed beta + telemetry

---

## 11) Success Metrics (Month-2 Targets)
- Interview completion rate: **>60%**
- Weekly active users: **~30% of registered**
- Clarity score: **>4.0/5**
- Manual entry accuracy: **>85%**
- Explained parameters/events: **10,000+** cumulative target band
- Doctor waitlist (phase-2 prep): **50+**

---

## 12) Strategic Moat (Long-term)
1. Data network effects from longitudinal usage
2. India-specific medical communication and references
3. Trust via consistent safe framing + transparency
4. Irreplaceable personal health memory depth

---

## Final merged conclusion
The best executable path is:
- **Ship an education-first, manual-entry, safety-constrained MVP in 30 days**
- **Prove demand and retention before doctor-heavy operations**
- **Convert usage into longitudinal intelligence and subscription moat**

This merged plan keeps ambition intact while making delivery realistic under solo, low-budget constraints.