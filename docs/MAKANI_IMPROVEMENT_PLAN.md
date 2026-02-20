# مكاني يفهمني — Structured Improvement Plan

Production-level, clinically intelligent therapeutic planning assistant.  
Implement in **small, safe increments**. After each step: run `npm run build` and verify routes/API unchanged.

---

## Phase 1: Arabic Language Excellence

**Goal:** 100% Arabic user-facing output; grammatically correct, natural phrasing; no repetition.

| Step | Description | Risk | API/Route impact |
|------|-------------|------|-------------------|
| **1.1** | Expand `objectTranslations` with more MobileNet labels; ensure fallback is always Arabic (no English). Audit any remaining English in formatter output. | Low | None |
| **1.2** | Add phrasing variants in the formatter (e.g. alternate step phrasings per focus) to reduce repetitive wording. | Low | None |
| **1.3** | Optional: Add Arabic synonyms for activity titles and goals so the same focus can be worded differently across activities. | Low | None |

---

## Phase 2: Deep Clinical Intelligence

**Goal:** Per-element analysis (fine/gross motor, sensory, daily living, env modification); goal-driven, object-specific, age-adaptive activities.

| Step | Description | Risk | API/Route impact |
|------|-------------|------|-------------------|
| **2.1** | Extend `EnvironmentElement` with optional `dailyLivingSkills?: string[]` and `environmentalModificationPotential?: string`; populate in `analyzeEnvironment` from object type. | Low | Add optional fields to internal type only; response shape unchanged. |
| **2.2** | Ensure each activity’s `therapeuticGoal` is explicitly tied to the object and age (strengthen templates in formatter). | Low | None |
| **2.3** | Add age-banded variants for key steps (e.g. &lt;4, 4–7, 7+) where missing; reinforce object-specific wording in steps. | Low | None |

---

## Phase 3: Parent vs Therapist Mode Redesign

**Goal:** Parent = simple steps, duration, safety, age adaptation; Therapist = rationale, skill domain, grading, measurable goals.

| Step | Description | Risk | API/Route impact |
|------|-------------|------|-------------------|
| **3.1** | Audit parent-mode content: confirm simple steps, duration, safety notes, age adaptation are present and clear. | Low | None |
| **3.2** | Therapist mode: add to `formattedArabic` (therapist only): `clinicalRationale?: string`, `gradingSuggestions?: string` (ترقية/تخفيض), `measurableGoal?: string`. Keep optional so existing clients ignore if absent. | Medium | Add optional fields to response; backward compatible. |
| **3.3** | Populate new therapist fields in formatter (rationale, grading, measurable goal) per therapeutic focus. | Low | None |

---

## Phase 4: Performance Optimization

**Goal:** No unnecessary re-runs of image analysis; clear separation of analysis vs activity generation; faster response.

| Step | Description | Risk | API/Route impact |
|------|-------------|------|-------------------|
| **4.1** | Refactor route **internally**: extract `runImageAnalysis(imageBuffer)` → labels; `buildActivitiesFromAnalysis(labels, age, userMode)` → activities. Single POST unchanged; same request/response. | Low | None |
| **4.2** | Optional later: in-memory cache of last analysis keyed by image hash (e.g. for “regenerate activities” without re-running MobileNet). | Medium | New optional query/body param only if needed. |

---

## Implementation Order

1. **Phase 1.1** — Arabic translations and fallback (first step).
2. **Phase 1.2** — Phrasing variants.
3. **Phase 2.1** — Environment element extensions.
4. **Phase 2.2–2.3** — Goal and age-specific wording.
5. **Phase 3.1** — Parent-mode audit.
6. **Phase 3.2–3.3** — Therapist-only fields and content.
7. **Phase 4.1** — Internal separation of image analysis and activity generation.

---

## Constraints (Do Not Break)

- **Routes:** `POST /api/analyze` request (image, age, userMode) and response shape must remain valid; new fields must be optional/additive.
- **UI:** Existing `result.activitiesArabic` and `formattedArabic` usage must keep working.
- **Build:** `npm run build` must succeed after every step.

---

*Next: implement **Step 1.1** (Arabic translations + no-English fallback).*
