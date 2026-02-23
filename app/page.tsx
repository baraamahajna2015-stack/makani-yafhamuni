"use client";

import { useState, useEffect, type FormEvent } from "react";
import { FORM, HERO, SECTIONS, ERRORS, USER_MODE_LABELS, INSIGHT } from "./ui-strings";

const LOADING_MESSAGES = [
  "جاري تحليل عناصر البيئة...",
  "مطابقة النتائج مع العمر...",
  "بناء أنشطة مخصصة...",
] as const;

type TherapeuticFocus = "sensory_regulation" | "motor_planning" | "executive_function" | "fine_motor" | "gross_motor" | "bilateral_coordination";

type Activity = {
  objectLabel: string;
  therapeuticFocus: TherapeuticFocus;
  description: string;
};

type ArabicFormattedActivity = {
  objectLabel: string;
  objectLabelArabic: string;
  therapeuticFocus: TherapeuticFocus;
  therapeuticFocusArabic: string;
  formattedArabic: {
    activityName: string;
    therapeuticGoal: string;
    targetSkill?: string;
    implementationSteps: string[];
    suggestedDuration?: string;
    ageAdaptations: string;
    successIndicators: string;
    safetyWarnings: string;
    clinicalRationale?: string;
    suggestedProgression?: string;
    environmentalModificationTips?: string;
    functionalOutcome?: string;
    environmentalAdaptation?: string;
  };
};

type ReasonedElement = {
  rawLabel: string;
  elementNameAr: string;
  functionalCategory: string;
  contextualInterpretation: string;
  confidenceAfterProcessing: number;
};

type ApiResponse =
  | {
      age: number;
      labels: string[];
      labelsArabic: string[];
      activities: Activity[];
      activitiesArabic: ArabicFormattedActivity[];
      userMode: "parent" | "therapist";
      reasonedElements?: ReasonedElement[];
      error?: undefined;
    }
  | {
      error: string;
      age?: undefined;
      labels?: undefined;
      labelsArabic?: undefined;
      activities?: undefined;
      activitiesArabic?: undefined;
      userMode?: undefined;
      reasonedElements?: undefined;
    };

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [age, setAge] = useState<string>("");
  const [userMode, setUserMode] = useState<"parent" | "therapist">("parent");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const id = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(id);
  }, [loading]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!imageFile) {
      setError(ERRORS.selectImage);
      return;
    }

    const ageNumber = Number(age);
    if (!ageNumber || ageNumber <= 0) {
      setError(ERRORS.validAge);
      return;
    }

    // Log user mode when generating activities (for Step 2 integration later)
    console.log("User mode:", userMode);

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("age", String(ageNumber));
    formData.append("userMode", userMode);

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data: ApiResponse = await res.json();

      if (!res.ok || "error" in data) {
        setError(data.error || ERRORS.somethingWrong);
        return;
      }

      console.log("API response (full):", data);
      setResult(data);
    } catch (err) {
      setError(ERRORS.serverError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrapper relative flex min-h-screen items-center justify-center bg-transparent font-sans" dir="rtl">
      <div className="hero-bg" aria-hidden="true" role="presentation">
        <svg className="hero-bg__lines" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect x="18%" y="22%" width="22%" height="28%" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" fill="none" />
          <rect x="58%" y="32%" width="20%" height="24%" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.35" fill="none" />
          <rect x="32%" y="58%" width="26%" height="22%" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" fill="none" />
          <line x1="28%" y1="38%" x2="38%" y2="38%" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.25" />
          <line x1="62%" y1="48%" x2="72%" y2="48%" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.2" />
        </svg>
      </div>
      <main className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/40 bg-white/75 p-8 shadow-lg shadow-black/5 backdrop-blur-md dark:border-zinc-600/30 dark:bg-zinc-900/70 dark:shadow-black/10">
        <div className="mb-10 space-y-3">
          <h1 className="bg-gradient-to-r from-[#1e3a5f] via-[#2d5a87] to-[#1a2f4a] bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-slate-200 dark:via-slate-100 dark:to-slate-300">
            {HERO.title}
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {HERO.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {FORM.image}
            </label>
            <input
              type="file"
              accept="image/*"
              aria-label={FORM.imageAria}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImageFile(file);
              }}
              className="mt-1 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:file:bg-zinc-100 dark:file:text-black dark:hover:file:bg-zinc-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {FORM.childAgeYears}
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={age}
              aria-label={FORM.ageAria}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              placeholder={FORM.agePlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {FORM.userMode}
            </label>
            <div className="mt-1 flex gap-0 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setUserMode("parent")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition ${
                  userMode === "parent"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                    : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {USER_MODE_LABELS.parent}
              </button>
              <button
                type="button"
                onClick={() => setUserMode("therapist")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition ${
                  userMode === "therapist"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                    : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {USER_MODE_LABELS.therapist}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-label={FORM.submitAria}
            className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white shadow-md transition-all duration-200 ease-out hover:bg-zinc-800 hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-500 disabled:shadow-md disabled:scale-100 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 dark:hover:shadow-lg"
          >
            {loading ? FORM.submitting : FORM.submit}
          </button>
        </form>

        {loading && (
          <div className="mt-6 rounded-xl border border-white/40 bg-white/60 py-6 px-5 backdrop-blur-sm dark:border-zinc-600/30 dark:bg-zinc-800/50" role="status" aria-label={FORM.loadingAria} dir="rtl">
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" aria-hidden />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {LOADING_MESSAGES[loadingStep]}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {result && !("error" in result) && (
          <section className="mt-10 space-y-12 animate-result-enter">
            <div className="mb-8 h-px w-full shrink-0 bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-700" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold leading-snug tracking-tight text-[#1a2f4a] dark:text-[#94a8c4]">
                {SECTIONS.detectedObjects}
              </h2>
              {(() => {
                const useReasoned =
                  result.reasonedElements &&
                  result.reasonedElements.length > 0;
                const elements = useReasoned
                  ? result.reasonedElements!
                  : result.labelsArabic.map((labelArabic, i) => ({
                      elementNameAr: labelArabic,
                      functionalCategory: "",
                      confidenceAfterProcessing: 0,
                    }));
                const isEmpty = elements.length === 0;
                if (isEmpty) {
                  return (
                    <p className="mt-2 text-sm leading-loose text-zinc-600 dark:text-zinc-400">
                      {SECTIONS.noObjectsDetected}
                    </p>
                  );
                }
                return (
                  <ul className="mt-2 space-y-2 text-sm leading-loose">
                    {elements.map((el, index) => (
                      <li
                        key={
                          useReasoned
                            ? (el as ReasonedElement).rawLabel + index
                            : `fallback-${index}`
                        }
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
                        dir="rtl"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-100">
                          {el.elementNameAr}
                        </span>
                        {/* Confidence is never displayed; reserved for internal reasoning only. */}
                        {useReasoned && (el as ReasonedElement).functionalCategory && (
                          <>
                            <span className="mx-1.5 text-zinc-500">•</span>
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {(el as ReasonedElement).functionalCategory}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            {result.activitiesArabic.length > 0 && (
              <div>
                <div className="mb-8 h-px w-full shrink-0 bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-700" aria-hidden="true" />
                <h2 className="text-xl font-semibold leading-snug tracking-tight text-[#1a2f4a] dark:text-[#94a8c4]">
                  {SECTIONS.suggestedActivities}
                </h2>
                <ul className="mt-5 space-y-10 text-zinc-800 dark:text-zinc-100">
                  {result.activitiesArabic.map((activity, index) => (
                    <li
                      key={`${activity.objectLabel}-${activity.therapeuticFocus}-${index}`}
                      className="animate-result-enter rounded-xl border border-slate-200 bg-white p-6 opacity-0 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
                      style={{ animationDelay: `${index * 70}ms` }}
                      dir="rtl"
                    >
                      <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {activity.therapeuticFocusArabic} • {activity.objectLabelArabic}
                      </p>
                      <div className="space-y-5 text-sm leading-loose">
                        <div>
                          <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            1. اسم النشاط:
                          </p>
                          <p className="text-base font-bold leading-snug text-zinc-900 dark:text-zinc-50">
                            {activity.formattedArabic.activityName}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            2. الهدف العلاجي:
                          </p>
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {activity.formattedArabic.therapeuticGoal}
                          </p>
                        </div>
                        {activity.formattedArabic.targetSkill && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              المهارة المستهدفة:
                            </p>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {activity.formattedArabic.targetSkill}
                            </p>
                          </div>
                        )}
                        {activity.formattedArabic.clinicalRationale && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              المبرر العلاجي الاحترافي:
                            </p>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {activity.formattedArabic.clinicalRationale}
                            </p>
                          </div>
                        )}
                        {activity.formattedArabic.functionalOutcome && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              النتيجة الوظيفية:
                            </p>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {activity.formattedArabic.functionalOutcome}
                            </p>
                          </div>
                        )}
                        {activity.formattedArabic.environmentalAdaptation && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              التكيف البيئي:
                            </p>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {activity.formattedArabic.environmentalAdaptation}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            3. طريقة التنفيذ:
                          </p>
                          <ol className="list-decimal list-inside space-y-2 pr-4 text-zinc-700 dark:text-zinc-300">
                            {activity.formattedArabic.implementationSteps.map((step, stepIndex) => (
                              <li key={stepIndex} className="mb-2">
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            4. تعديل حسب العمر:
                          </p>
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {activity.formattedArabic.ageAdaptations}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            5. مؤشرات نجاح:
                          </p>
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {activity.formattedArabic.successIndicators}
                          </p>
                        </div>
                        {activity.formattedArabic.suggestedDuration && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              المدة المقترحة:
                            </p>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {activity.formattedArabic.suggestedDuration}
                            </p>
                          </div>
                        )}
                        {activity.formattedArabic.suggestedProgression && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              التقدم المقترح (ترقية/تخفيض):
                            </p>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {activity.formattedArabic.suggestedProgression}
                            </p>
                          </div>
                        )}
                        {activity.formattedArabic.environmentalModificationTips && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              نصائح تعديل البيئة:
                            </p>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {activity.formattedArabic.environmentalModificationTips}
                            </p>
                          </div>
                        )}
                        {activity.formattedArabic.safetyWarnings && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                              تحذيرات أمان:
                            </p>
                            <p className="text-zinc-700 dark:text-zinc-300">
                              {activity.formattedArabic.safetyWarnings}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 animate-result-enter rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-5 py-4 opacity-0 shadow-sm backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-800/50" style={{ animationDelay: `${(result.activitiesArabic?.length ?? 0) * 70}ms` }} dir="rtl">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#1a2f4a] dark:text-[#94a8c4]">
                    {INSIGHT.title}
                  </p>
                  <p className="text-sm leading-loose text-zinc-700 dark:text-zinc-300">
                    {INSIGHT.summary}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
