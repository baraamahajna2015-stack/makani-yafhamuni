"use client";

import { useState, type FormEvent } from "react";
import { FORM, HERO, SECTIONS, ERRORS, USER_MODE_LABELS } from "./ui-strings";

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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

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
    <div className="flex min-h-screen items-center justify-center bg-transparent font-sans" dir="rtl">
      <main className="w-full max-w-2xl rounded-2xl bg-white/95 p-8 shadow-sm backdrop-blur-sm dark:bg-zinc-950/95">
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
            className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white shadow-md transition-all duration-200 ease-out hover:bg-zinc-800 hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-500 disabled:shadow-md disabled:scale-100 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 dark:hover:shadow-lg"
          >
            {loading ? FORM.submitting : FORM.submit}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {result && !("error" in result) && (
          <section className="mt-10 space-y-8">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#1e3a5f] dark:text-slate-300">
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
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {SECTIONS.noObjectsDetected}
                    </p>
                  );
                }
                return (
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed">
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
                <h2 className="text-lg font-semibold tracking-tight text-[#1e3a5f] dark:text-slate-300">
                  {SECTIONS.suggestedActivities}
                </h2>
                <ul className="mt-4 space-y-8 text-zinc-800 dark:text-zinc-100">
                  {result.activitiesArabic.map((activity, index) => (
                    <li
                      key={`${activity.objectLabel}-${activity.therapeuticFocus}-${index}`}
                      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
                      dir="rtl"
                    >
                      <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {activity.therapeuticFocusArabic} • {activity.objectLabelArabic}
                      </p>
                      <div className="space-y-5 text-sm leading-relaxed">
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
                              المبرر السريري:
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
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
