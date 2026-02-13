"use client";

import { useState, type FormEvent } from "react";

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
    implementationSteps: string[];
    ageAdaptations: string;
    successIndicators: string;
    safetyWarnings: string;
  };
};

type ApiResponse =
  | {
      age: number;
      labels: string[];
      labelsArabic: string[];
      activities: Activity[];
      activitiesArabic: ArabicFormattedActivity[];
      userMode: "parent" | "therapist";
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
      setError("Please select an image.");
      return;
    }

    const ageNumber = Number(age);
    if (!ageNumber || ageNumber <= 0) {
      setError("Please enter a valid age.");
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
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Failed to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-950">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Makani Activity Ideas
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Upload an image of your child&apos;s environment and enter their age.
          The image is processed only in memory, and any faces or people are
          ignored.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Image
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
              Child&apos;s age (years)
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-0 transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              placeholder="e.g. 5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              User mode
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
                Parent
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
                Therapist
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            {loading ? "Analyzing..." : "Generate Activities"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {result && !("error" in result) && (
          <section className="mt-8 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Detected objects
              </h2>
              {result.labels.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  No non-human objects detected. Try a different image.
                </p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2 text-sm">
                  {result.labelsArabic.map((labelArabic, index) => (
                    <li
                      key={result.labels[index]}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                      dir="rtl"
                    >
                      {labelArabic}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {result.activitiesArabic.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Suggested activities
                </h2>
                <ul className="mt-2 space-y-6 text-sm text-zinc-800 dark:text-zinc-100">
                  {result.activitiesArabic.map((activity, index) => (
                    <li
                      key={`${activity.objectLabel}-${activity.therapeuticFocus}-${index}`}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950"
                      dir="rtl"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-4">
                        {activity.therapeuticFocusArabic} • {activity.objectLabelArabic}
                      </p>
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            1. اسم النشاط:
                          </p>
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {activity.formattedArabic.activityName}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            2. الهدف العلاجي:
                          </p>
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {activity.formattedArabic.therapeuticGoal}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                            3. طريقة التنفيذ:
                          </p>
                          <ol className="list-decimal list-inside space-y-2 text-zinc-700 dark:text-zinc-300 pr-4">
                            {activity.formattedArabic.implementationSteps.map((step, stepIndex) => (
                              <li key={stepIndex} className="mb-2">
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            4. تعديل حسب العمر:
                          </p>
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {activity.formattedArabic.ageAdaptations}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            5. مؤشرات نجاح:
                          </p>
                          <p className="text-zinc-700 dark:text-zinc-300">
                            {activity.formattedArabic.successIndicators}
                          </p>
                        </div>
                        {activity.formattedArabic.safetyWarnings && (
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                              6. تحذيرات أمان:
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
