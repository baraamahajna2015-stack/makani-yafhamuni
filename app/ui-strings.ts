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
  imageAria: "اختيار ملف الصورة",
  childAgeYears: "عمر الطفل (بالسنوات)",
  ageAria: "إدخال عمر الطفل بالسنوات",
  userMode: "وضع الاستخدام",
  agePlaceholder: "مثال: ٥",
  submit: "إنشاء الأنشطة",
  submitAria: "تنفيذ التحليل وإنشاء الأنشطة",
  submitting: "جاري التحليل...",
  loadingAria: "جاري تحليل الصورة وإنشاء الأنشطة",
} as const;

/** Hero / intro */
export const HERO = {
  title: "مكاني يفهمني",
  subtitle:
    "ارفع صورة لبيئة الطفل وأدخل عمره. المعالجة تتم محلياً ولا تشمل وجوهاً أو أشخاصاً.",
} as const;

/** Section headings */
export const SECTIONS = {
  detectedObjects: "عناصر البيئة المُستخرجة",
  noObjectsDetected: "لم يُعثر على عناصر غير بشرية في الصورة. يُفضّل تجربة صورة أخرى.",
  suggestedActivities: "الأنشطة العلاجية المقترحة",
} as const;

/** AI Insight box (below generated activities) */
export const INSIGHT = {
  title: "ملاحظة تحليلية",
  summary:
    "صياغة الأنشطة أعلاه مبنية على عناصر البيئة المُستخرجة وملاءمتها لعمر الطفل، وفق أهداف علاجية محددة.",
} as const;

/** Error messages */
export const ERRORS = {
  selectImage: "يُرجى اختيار صورة.",
  validAge: "يُرجى إدخال عمر صحيح.",
  somethingWrong: "حدث خطأ غير متوقع.",
  serverError: "تعذّر الاتصال بالخادم.",
  tryAgain: "حدث خطأ. يُرجى المحاولة مرة أخرى.",
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
