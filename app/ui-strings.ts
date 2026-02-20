/**
 * Mapping layer: internal values → Arabic UI labels.
 * Logic and API continue to use English enum/type values.
 */

export type UserMode = "parent" | "therapist";

/** User mode selection: internal value → Arabic label */
export const USER_MODE_LABELS: Record<UserMode, string> = {
  parent: "أهل",
  therapist: "معالج",
};

/** Form labels */
export const FORM = {
  image: "صورة",
  childAgeYears: "عمر الطفل (بالسنوات)",
  userMode: "وضع الاستخدام",
  agePlaceholder: "مثال: ٥",
  submit: "إنشاء الأنشطة",
  submitting: "جاري التحليل...",
} as const;

/** Hero / intro */
export const HERO = {
  title: "مكاني يفهمني",
  subtitle:
    "ارفع صورة لبيئة طفلك وأدخل عمره. تُعالج الصورة في الذاكرة فقط ولا تُستخدم وجوه أو أشخاص.",
} as const;

/** Section headings */
export const SECTIONS = {
  detectedObjects: "العناصر المكتشفة",
  noObjectsDetected: "لم يُكتشف عناصر غير بشرية. جرّب صورة أخرى.",
  suggestedActivities: "الأنشطة المقترحة",
} as const;

/** Error messages */
export const ERRORS = {
  selectImage: "الرجاء اختيار صورة.",
  validAge: "الرجاء إدخال عمر صحيح.",
  somethingWrong: "حدث خطأ ما.",
  serverError: "تعذّر الاتصال بالخادم.",
  tryAgain: "حدث خطأ. الرجاء المحاولة مرة أخرى.",
} as const;

/** Upload page (if used) */
export const UPLOAD_PAGE = {
  title: "رفع الصورة والتحليل",
  image: "صورة",
  age: "العمر",
  analyze: "تحليل",
  analyzing: "جاري التحليل...",
  activity: "النشاط",
  goal: "الهدف",
} as const;
