/**
 * Intelligent refinement layer: improves activity quality without changing
 * system structure or adding latency. Applies functional relevance, therapeutic
 * depth, real-world feasibility, diversity, and humanization.
 */

import type { EnvironmentElement } from './environment';
import type { TherapeuticFocus } from './environment';

export type ActivityCandidate = {
  objectLabel: string;
  therapeuticFocus: TherapeuticFocus;
  element: EnvironmentElement;
};

export type RefinedActivity = ActivityCandidate & {
  /** Seed for formatter to pick mode-appropriate specific skill (rule 2). */
  specificSkillSeed?: number;
  humanizeOffset?: number;
};

/** Specific, observable skills per focus — replaces generic targets (rule 2). */
const SPECIFIC_SKILLS: Record<TherapeuticFocus, { parent: string[]; therapist: string[] }> = {
  sensory_regulation: {
    parent: [
      'تنظيم الاستجابة الحسية والهدوء في المواقف اليومية',
      'معالجة متعددة الأنظمة مع تحكم في مستوى الإثارة',
      'استجابة هادئة للمؤثرات مع انتباه مستمر',
    ],
    therapist: [
      'معالجة متعددة الأنظمة، التنظيم الذاتي لمستوى الإثارة، تحمل تدريجي للمدخلات',
      'تكامل حسي وتعديل مستوى اليقظة مع تثبيت انتباه',
      'تنظيم الإثارة ومراقبة الاستجابة مع ضبط المدة',
    ],
  },
  motor_planning: {
    parent: [
      'التسلسل الحركي: تخطيط ثم تنفيذ خطوة بخطوة دون تخطي',
      'الذاكرة الحركية والمرونة في تعديل الخطة عند الطلب',
      'تمثيل المسار ثم التنفيذ المتسلسل مع توقف للتحقق',
    ],
    therapist: [
      'التخطيط الحركي والتسلسل الحركي والذاكرة الحركية والمرونة في تعديل الخطة',
      'تمثيل حركي للمسار ثم تنفيذ مراقَب مع تحقق بعد كل خطوة',
      'برمجة حركية وتسلسل مع مرونة في تغيير الخطة',
    ],
  },
  executive_function: {
    parent: [
      'التخطيط والترتيب والتنفيذ دون تخطي مع كبح الاندفاع',
      'الذاكرة العاملة: استدعاء الترتيب بعد التنفيذ',
      'ترتيب عناصر ثم تنفيذ مراقَب والتحقق من كل خطوة',
    ],
    therapist: [
      'التخطيط والتنظيم والذاكرة العاملة وكبح الاندفاع والمرونة المعرفية',
      'تنفيذ مراقَب للتسلسل مع استدعاء من الذاكرة بعد الانتهاء',
      'صياغة الخطة ثم التنفيذ المتسلسل مع تحقق ومراقبة ذاتية',
    ],
  },
  fine_motor: {
    parent: [
      'القبضة الوظيفية وتثبيت الجسم مع تحكم في القوة',
      'التنسيق البصري الحركي ووضع الهدف بدقة (تعديل القوة والمسافة)',
      'الحركة الدقيقة والتتبع بأصابع منفصلة مع ثبات',
    ],
    therapist: [
      'القبضة الوظيفية والتحكم الرأسي والدوراني والتنسيق البصري الحركي',
      'تثبيت بقبضة ثلاثية وتنفيذ بدقة مع تعديل القوة المتدرجة',
      'حركة دقيقة منفصلة الأصابع مع تتبع ووضع في الهدف',
    ],
  },
  gross_motor: {
    parent: [
      'التوازن الديناميكي والثبات الوضعي أثناء المشي والوقوف',
      'الوعي المكاني والجسمي مع خطوات مستقرة ورفع رجل',
      'الحركة الكلية والتكامل الحسي الحركي في المساحة المتاحة',
    ],
    therapist: [
      'التوازن الديناميكي والثابت والوعي الوضعي والحركة الكلية',
      'مشي متحكم ورفع رجل مع ثبات ووعي بالجسم والمكان',
      'تكامل حسي حركي ووضعية مناسبة مع تحكم في المسافة والخطوات',
    ],
  },
  bilateral_coordination: {
    parent: [
      'ثبات اليد غير المهيمنة وتنفيذ باليد المهيمنة مع التبديل',
      'التنسيق الثنائي أثناء تثبيت الجسم ونقل بيدين معاً',
      'تكامل نصفي الجسم: تثبيت ثم تنفيذ ثم نقل مشترك',
    ],
    therapist: [
      'ثبات يد وتنفيذ باليد الأخرى والتبديل والتنسيق المركّب',
      'تثبيت ثنائي مع تنفيذ دقيق وانتقال إلى نقل بيدين',
      'تكامل نصفي الجسم مع تخطيط حركي ثنائي وتعديل القوة',
    ],
  },
};

/** Category for diversity (rule 4): motor | sensory | executive | adl. */
const CATEGORY: Record<TherapeuticFocus, 'motor' | 'sensory' | 'executive' | 'adl'> = {
  sensory_regulation: 'sensory',
  motor_planning: 'motor',
  executive_function: 'executive',
  fine_motor: 'motor',
  gross_motor: 'motor',
  bilateral_coordination: 'adl',
};

/** Performance demand for diversity: static | dynamic | bilateral | sequencing. */
const DEMAND: Record<TherapeuticFocus, 'static' | 'dynamic' | 'bilateral' | 'sequencing'> = {
  sensory_regulation: 'static',
  motor_planning: 'sequencing',
  executive_function: 'sequencing',
  fine_motor: 'static',
  gross_motor: 'dynamic',
  bilateral_coordination: 'bilateral',
};

/** Feasibility: focuses that need more space (rule 3). */
const NEEDS_SPACE: TherapeuticFocus[] = ['gross_motor', 'motor_planning'];

/** Age alignment: for very young children, prefer focuses with lower cognitive/motor-planning demand (rule 6). */
const PREFERRED_FOR_UNDER_4: TherapeuticFocus[] = ['sensory_regulation', 'fine_motor', 'gross_motor', 'bilateral_coordination'];
const LESS_SUITABLE_UNDER_4: TherapeuticFocus[] = ['executive_function', 'motor_planning'];

function isFeasibleInSpace(a: ActivityCandidate): boolean {
  const el = a.element;
  if (!el) return true;
  if (el.space !== 'constrained') return true;
  if (!NEEDS_SPACE.includes(a.therapeuticFocus)) return true;
  return false;
}

/** Pick specific skill by stable seed (index + focus hash). */
function pickSpecificSkill(
  focus: TherapeuticFocus,
  userMode: 'parent' | 'therapist',
  seed: number
): string {
  const pool = SPECIFIC_SKILLS[focus][userMode];
  return pool[Math.abs(seed) % pool.length];
}

/** Humanization offset: 0–2 so formatter variants spread (rule 5). */
function getHumanizeOffset(index: number, focus: TherapeuticFocus): number {
  const h = (index * 7 + focus.length) % 3;
  return h;
}

/** Enforce diversity: if prev and curr share category and demand, return true (need swap). */
function areStructurallySimilar(prev: RefinedActivity, curr: RefinedActivity): boolean {
  return (
    CATEGORY[prev.therapeuticFocus] === CATEGORY[curr.therapeuticFocus] &&
    DEMAND[prev.therapeuticFocus] === DEMAND[curr.therapeuticFocus]
  );
}

/** One-time reorder: place activities so consecutive ones differ in category or demand. */
function enforceDiversityOrder(activities: RefinedActivity[]): RefinedActivity[] {
  if (activities.length <= 1) return activities;
  const out: RefinedActivity[] = [];
  const remaining = [...activities];

  while (remaining.length > 0) {
    const last = out[out.length - 1];
    let chosenIndex = 0;
    if (last) {
      const better = remaining.findIndex((a) => !areStructurallySimilar(last, a));
      if (better >= 0) chosenIndex = better;
    }
    const [chosen] = remaining.splice(chosenIndex, 1);
    out.push(chosen);
  }
  return out;
}

/**
 * Refines the activity list: functional relevance, therapeutic depth, feasibility,
 * diversity, and humanization. Does not change length; keeps same count.
 */
export function refineActivities(
  activities: ActivityCandidate[],
  _elements: EnvironmentElement[],
  age: number
): RefinedActivity[] {
  if (activities.length === 0) return [];

  let refined: RefinedActivity[] = activities.map((a, index) => {
    // Rule 3: real-world feasibility — substitute focus when constrained space + needs space
    let activity: RefinedActivity = { ...a };
    if (!isFeasibleInSpace(a)) {
      const sub = substituteFocusForSpace(a);
      if (sub !== a.therapeuticFocus) activity = { ...activity, therapeuticFocus: sub };
    }
    // Rule 6: age alignment — for very young (under 4), prefer developmentally appropriate focus when element allows
    if (age < 4 && LESS_SUITABLE_UNDER_4.includes(activity.therapeuticFocus)) {
      const ageSub = substituteFocusForAge(activity);
      if (ageSub !== activity.therapeuticFocus) activity = { ...activity, therapeuticFocus: ageSub };
    }

    // Rule 2: therapeutic depth — seed for formatter to pick specific observable skill per mode
    activity.specificSkillSeed = index + age + (activity.objectLabel.length % 5);

    // Rule 5: humanization — offset for formatter variant spread
    activity.humanizeOffset = getHumanizeOffset(index, activity.therapeuticFocus);

    return activity;
  });

  // Rule 4: diversity — reorder so consecutive activities differ in category/demand
  refined = enforceDiversityOrder(refined);

  return refined;
}

/** When space is constrained but focus needs space, prefer a focus that doesn't. */
function substituteFocusForSpace(a: ActivityCandidate): TherapeuticFocus {
  const el = a.element;
  const allowed = el?.motor?.length ? el.motor : (['fine_motor', 'sensory_regulation', 'executive_function'] as TherapeuticFocus[]);
  const prefers = allowed.filter((f) => !NEEDS_SPACE.includes(f));
  return (prefers[0] ?? allowed[0] ?? a.therapeuticFocus) as TherapeuticFocus;
}

/** When age is under 4, prefer a focus that is developmentally appropriate (lower cognitive/motor-planning demand). */
function substituteFocusForAge(a: ActivityCandidate): TherapeuticFocus {
  const el = a.element;
  const allowed = el?.motor?.length ? el.motor : (['sensory_regulation', 'fine_motor', 'gross_motor'] as TherapeuticFocus[]);
  const preferred = allowed.filter((f) => PREFERRED_FOR_UNDER_4.includes(f));
  return (preferred[0] ?? allowed[0] ?? a.therapeuticFocus) as TherapeuticFocus;
}

/** Expose for formatter: get specific skill text by focus and mode (used when activity has no override). */
export function getSpecificSkillDefault(
  focus: TherapeuticFocus,
  userMode: 'parent' | 'therapist',
  seed: number
): string {
  return pickSpecificSkill(focus, userMode, seed);
}
