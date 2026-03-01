# AyurNod Deep Ecosystem Research (Delivery Draft)

_Date: 2026-02-28_

## 0) Goal
Build a practical, high-trust, India-first health AI ecosystem for AyurNod that:
- improves clinical credibility and conversion,
- scales doctor consultations,
- enables supplements affiliate monetization,
- integrates wearables + reports,
- supports persistent per-user health memory,
- upgrades model quality via multi-model orchestration,
- and remains secure/compliant by design.

---

## 1) Research method + safety guardrails
I restricted source set to reputed, official, or industry-standard domains (government, standards bodies, platform docs, and established tech providers).

Safety filtering used during research:
- Prefer `.gov`, `.org`, official developer docs, and major standards organizations.
- Avoid random download portals, scraped mirrors, and unknown short-link domains.
- Treat all external content as untrusted until validated.

---

## 2) 20 reputed research websites to use continuously (core list)

### A) Healthcare policy, standards, trust (must-track)
1. **WHO Digital Health** — https://www.who.int/health-topics/digital-health  
   Why: global digital health strategy and public health framing.

2. **ABDM (Ayushman Bharat Digital Mission)** — https://abdm.gov.in/  
   Why: India digital health ecosystem alignment (critical for India-first scale).

3. **NIST AI Risk Management Framework** — https://www.nist.gov/itl/ai-risk-management-framework  
   Why: practical structure for trustworthy AI lifecycle governance.

4. **OWASP GenAI / LLM Security Top Risks** — https://genai.owasp.org/llm-top-10/  
   Why: threat model for prompt injection, data leakage, insecure tool use.

5. **ISO/IEC 27001 overview** — https://www.iso.org/standard/27001  
   Why: baseline ISMS framework for security maturity.

### B) Healthcare interoperability + data architecture
6. **HL7 FHIR Overview** — https://www.hl7.org/fhir/overview.html  
   Why: standard data model for clinical interoperability.

7. **SMART on FHIR** — https://build.fhir.org/ig/HL7/smart-app-launch/index.html  
   Why: OAuth-based secure app launch/access pattern for health data apps.

8. **Google Cloud Healthcare API** — https://cloud.google.com/healthcare-api  
   Why: managed FHIR/HL7v2/DICOM patterns for scalable pipelines.

9. **OpenAPI Initiative** — https://www.openapis.org/  
   Why: contract-first API design and partner integration stability.

### C) Wearables + consumer health device integration
10. **Apple Health/Fitness Developer** — https://developer.apple.com/health-fitness/  
    Why: HealthKit integration for iOS/watch ecosystems.

11. **Google Health Connect (Android)** — https://developer.android.com/health-and-fitness/guides/health-connect  
    Why: Android health data aggregation with user-consent controls.

12. **Fitbit Web API** — https://dev.fitbit.com/build/reference/web-api/  
    Why: activity, sleep, heart metrics via user-authorized APIs.

13. **Garmin Health API** — https://developer.garmin.com/gc-developer-program/health-api/  
    Why: enterprise-grade all-day vitals for RPM-style workflows.

14. **Samsung Health (Developer)** — https://developer.samsung.com/health  
    Why: Android ecosystem extension and device diversity.

### D) Affiliate commerce / growth rails
15. **Amazon Associates India** — https://affiliate-program.amazon.in/  
    Why: broad catalog and easy initial affiliate activation.

16. **impact.com** — https://impact.com/affiliate-marketing/  
    Why: large performance partnership network and workflow tooling.

17. **Awin** — https://www.awin.com/  
    Why: global affiliate network with many wellness brands.

18. **CJ (Commission Junction)** — https://www.cj.com/  
    Why: mature affiliate marketplace (validate India availability by merchant).

### E) AI orchestration + memory engineering
19. **OpenRouter Docs** — https://openrouter.ai/docs  
    Why: multi-model routing and fallback across providers.

20. **LangChain + LlamaIndex** — https://www.langchain.com/ and https://www.llamaindex.ai/  
    Why: orchestration, retrieval, observability, and memory pipelines.

> Notes:
> - Some source pages are marketing-heavy and require deeper subpage validation before production commitments.
> - For India-specific compliance/legal interpretation, get licensed legal review before rollout.

---

## 3) What AyurNod can add to stand out vs competitors

### 3.1 Product differentiators (high impact)
1. **Evidence+Explainability card on every recommendation**
   - Show: why suggested, confidence, contraindication checks, data sources used.
2. **Personal Health Timeline (PHL)**
   - Unified timeline: chat insights + vitals + reports + consult notes.
3. **Safety-first AI triage layer**
   - Red-flag escalation to doctor/hospital prompts with urgency class.
4. **India-first affordability intelligence**
   - “Best value”, “doctor-preferred”, “lowest price” toggles with transparent logic.
5. **Human+AI consult loop**
   - AI pre-consult summary + doctor verifies/edits + post-consult care plan sync.

### 3.2 Trust differentiators
- Plain-language “How this AI works” panel.
- Clinical review badges for doctor-reviewed flows.
- Data control center: export/delete/consent-history visible to user.

---

## 4) How to onboard more doctors and consultants

## 4.1 Doctor acquisition channels
1. **Direct onboarding portal** with KYC + specialty + license verification.
2. **Targeted outreach cohorts**: early-career specialists + tier-2 city general physicians.
3. **Medical associations / CME tie-ups** (regional chapters).
4. **Hospital/clinic partnerships** with white-label doctor panel access.
5. **Existing doctor platforms co-marketing** (where allowed by terms).

### 4.2 Value proposition doctors care about
- Fewer no-shows (smart scheduling + reminders).
- AI-generated pre-consult briefs (save time).
- Structured documentation assistant.
- Better patient follow-up retention.
- Transparent payout + performance analytics.

### 4.3 Doctor funnel metrics (must instrument)
- Lead -> KYC submit -> Verified -> Active first consult -> 30-day retention.
- Time-to-first-consult and earnings per active doctor.

---

## 5) Supplements/medicines affiliate strategy

### 5.1 Practical provider stack (recommended)
- **Tier 1 (launch fast):** Amazon Associates India + selected Impact/Awin merchants.
- **Tier 2 (quality optimization):** Add direct merchants with cleaner feeds and better EPC.
- **Tier 3 (scale):** build offer optimizer (conversion vs commission vs price policy-driven).

### 5.2 Ranking logic for checkout recommendations
Weighted score (configurable by business mode):
- Availability score
- Price competitiveness
- Estimated conversion rate
- Commission yield
- Return/refund reliability

Recommended modes:
- **User-first mode:** max conversion + satisfaction
- **Revenue mode:** balanced conversion + commission
- **Savings mode:** lowest landed price

### 5.3 Compliance
- Always disclose affiliate relationship near CTA.
- Avoid disease-cure claims for supplements.
- Keep medical disclaimer and doctor escalation where needed.

---

## 6) Wearables & smart device integration strategy

### 6.1 Integration order
1. Health Connect (Android)
2. Apple HealthKit (iOS)
3. Fitbit API
4. Garmin Health API
5. Samsung Health

### 6.2 Canonical data model (internal)
Normalize all devices into one schema:
- resting_hr, avg_hr, spo2, sleep_duration, sleep_quality,
- steps, calories, activity_minutes,
- bp_systolic/diastolic (if available),
- timestamp + source + confidence.

### 6.3 Reliability architecture
- pull schedule + webhook where available,
- deduplication by source_event_id,
- late-arrival reconciliation,
- per-metric quality flags.

---

## 7) Camera/report ingestion + long-term AI memory system

### 7.1 Camera/report feature
- User uploads lab report image/PDF.
- OCR + document parsing pipeline extracts structured values.
- Human-readable summary + trend comparison generated.
- User confirms extracted values before final save.

### 7.2 Longitudinal memory (per user)
Adopt a **3-layer memory architecture**:
1. **Session memory**: current chat context.
2. **Clinical memory**: stable profile (conditions, allergies, meds, baseline vitals).
3. **Event memory**: time-series events (reports, symptoms, consult outcomes).

### 7.3 Memory retrieval in chat
Before answering, run retrieval on:
- recent events (7/30/90-day windows),
- active conditions/medications,
- latest abnormal labs,
- last doctor advice.

Then generate response with:
- “based on your recent data…” explainability snippet.

### 7.4 Safety controls
- consent-gated memory usage,
- audit log for every read/write,
- user-visible memory timeline,
- one-click revoke/delete pathways.

---

## 8) Multi-model strategy (3 to 7 models simultaneously)

### 8.1 Why multi-model
- better reliability (fallbacks),
- lower cost (route simple tasks to cheap models),
- better quality (specialized models by task),
- reduced outage risk.

### 8.2 Suggested task-based routing
- **Triage/safety classifier:** small fast model.
- **Clinical reasoning summary:** stronger premium model.
- **Extraction/OCR structuring:** document-specialized model.
- **Translation/local language:** multilingual model.
- **Final user response polish:** mid-tier instruction model.

### 8.3 Orchestration pattern
- Router -> primary model -> validator model -> finalizer.
- Confidence thresholding; if below threshold, auto-escalate model tier.
- Cache stable outputs to reduce cost/latency.

### 8.4 Local + API hybrid suggestion
- keep sensitive preprocessing local where feasible,
- use cloud models for high-quality synthesis,
- maintain strict PII minimization before external calls.

---

## 9) Better user profiling via guided MCQ intake

### 9.1 MCQ onboarding blocks (progressive, not overwhelming)
1. Demographics + lifestyle basics.
2. Medical history + family risk.
3. Current symptoms and duration.
4. Medication/supplement use.
5. Goals (fat loss, sugar control, stress, sleep, etc).
6. Device/report availability.

### 9.2 Conversation strategy
- Start with 6–8 high-yield MCQs.
- Branch dynamically based on answers.
- Explain why each question is asked.
- Let user skip sensitive questions.

### 9.3 Scoring outputs
Generate:
- profile completeness score,
- risk flags,
- confidence score for recommendations,
- “next best question” queue.

---

## 10) Proposed implementation roadmap (practical)

### Phase A (Week 1–2)
- Finalize data contracts: profile, memory, device events, report schema.
- Build MCQ onboarding engine + profile completeness scoring.
- Implement memory timeline API (read/write/audit).

### Phase B (Week 3–4)
- Ship report upload (image/PDF) + OCR + confirmation flow.
- Add explainability/safety cards in chat + supplements.
- Launch doctor onboarding funnel MVP + dashboard.

### Phase C (Week 5–6)
- Integrate Health Connect + HealthKit.
- Add 2-device connectors (Fitbit/Garmin first).
- Deploy multi-model router with fallback + eval metrics.

### Phase D (Week 7–8)
- Expand affiliate feed quality + ranking optimizer modes.
- Add cohort analytics: retention, consult conversion, supplement conversion.
- Hardening: security tests, abuse checks, privacy controls.

---

## 11) KPI framework (what success looks like)
- Consult conversion rate uplift.
- 30-day returning user rate.
- Doctor activation and retention.
- Recommendation acceptance rate.
- Supplement outbound conversion + EPC.
- Safety metrics: escalation precision/recall.
- Latency and cost per successful session.

---

## 12) Immediate decisions needed from product owner (blocking)
1. Affiliate optimization rule priority: **conversion vs commission vs lowest price**.
2. Initial provider priority order for live feeds.
3. Doctor onboarding geo/specialty priority (first 3 specialties + top 5 cities).
4. Consent policy defaults for memory and device sync.
5. Whether to enable local model layer in current infra phase.

---

## Source links used in this research pass
- WHO Digital Health: https://www.who.int/health-topics/digital-health
- ABDM: https://abdm.gov.in/
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
- OWASP GenAI: https://genai.owasp.org/llm-top-10/
- ISO 27001 overview: https://www.iso.org/standard/27001
- HL7 FHIR overview: https://www.hl7.org/fhir/overview.html
- SMART on FHIR: https://build.fhir.org/ig/HL7/smart-app-launch/index.html
- Google Cloud Healthcare API: https://cloud.google.com/healthcare-api
- OpenAPI Initiative: https://www.openapis.org/
- Apple Health/Fitness: https://developer.apple.com/health-fitness/
- Android Health Connect: https://developer.android.com/health-and-fitness/guides/health-connect
- Fitbit Web API: https://dev.fitbit.com/build/reference/web-api/
- Garmin Health API: https://developer.garmin.com/gc-developer-program/health-api/
- Samsung Health Dev: https://developer.samsung.com/health
- Amazon Associates India: https://affiliate-program.amazon.in/
- impact.com affiliate: https://impact.com/affiliate-marketing/
- Awin: https://www.awin.com/
- CJ: https://www.cj.com/
- OpenRouter docs: https://openrouter.ai/docs
- LangChain: https://www.langchain.com/
- LlamaIndex: https://www.llamaindex.ai/
- Practo providers (doctor-side signal): https://www.practo.com/providers
- Apollo 24/7 (market benchmark): https://www.apollo247.com/

---

## Final note
This draft is intentionally execution-oriented, not just descriptive. It can be converted directly into phased Jira/Linear tickets with owners, acceptance criteria, and API contracts in the next pass.
