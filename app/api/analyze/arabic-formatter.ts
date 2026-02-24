import type { EnvironmentElement } from './environment';
import { getSpecificSkillDefault } from './refinement';
import { mustUseSafeAlternatives } from './safety-validation';

type TherapeuticFocus = 'sensory_regulation' | 'motor_planning' | 'executive_function' | 'fine_motor' | 'gross_motor' | 'bilateral_coordination';
type UserMode = 'parent' | 'therapist';

export interface Activity {
  objectLabel: string;
  therapeuticFocus: TherapeuticFocus;
  description: string;
  element?: EnvironmentElement;
  /** Refinement: seed for picking specific observable skill (therapeutic depth). */
  specificSkillSeed?: number;
  /** Refinement: offset for variant spread (humanization). */
  humanizeOffset?: number;
}

interface ArabicFormattedActivity {
  objectLabel: string;
  objectLabelArabic: string;
  therapeuticFocus: TherapeuticFocus;
  therapeuticFocusArabic: string;
  formattedArabic: {
    activityName: string;
    therapeuticGoal: string;
    targetSkill: string;
    toolsUsed: string;
    implementationSteps: string[];
    suggestedDuration: string;
    ageAdaptations: string;
    successIndicators: string;
    safetyWarnings: string;
    /** Therapeutic intelligence: مبرر علاجي احترافي، تقدم مقترح، نصائح بيئية، نتيجة وظيفية، تكيف بيئي */
    clinicalRationale?: string;
    suggestedProgression?: string;
    environmentalModificationTips?: string;
    functionalOutcome?: string;
    environmentalAdaptation?: string;
  };
}

function getElementContextPhrase(element: EnvironmentElement, objectLabelArabic: string): string {
  const heightPhrase: Record<string, string> = {
    floor: 'الموجودة على الأرضية',
    low: 'المنخفضة',
    mid: 'بارتفاع الركبة أو الورك',
    table: 'الواقعة على سطح الطاولة أو بارتفاع الطاولة',
    elevated: 'المرتفعة أو على الدرج',
  };
  const stabilityPhrase: Record<string, string> = {
    stable: 'المستقرة',
    mobile: 'القابلة للتحريك',
    fixed: 'الثابتة',
  };
  const positionPhrase: Record<string, string> = {
    central: 'في منتصف الغرفة',
    corner: 'في الزاوية',
    against_wall: 'المُلاصقة للجدار',
    edge: 'عند طرف المساحة',
    open: 'في مساحة مفتوحة',
  };
  const spacePhrase: Record<string, string> = {
    spacious: 'مع مساحة كافية حولها',
    moderate: 'مع مساحة متوسطة',
    constrained: 'في مساحة محدودة',
  };
  const h = heightPhrase[element.height] ?? '';
  const s = stabilityPhrase[element.stability] ?? '';
  const p = positionPhrase[element.position] ?? '';
  const sp = spacePhrase[element.space] ?? '';
  const parts = [objectLabelArabic, h, s].filter(Boolean);
  const loc = [p, sp].filter(Boolean).join('، ');
  if (loc) parts.push(loc);
  return parts.join(' ');
}

const TARGET_SKILL: Record<TherapeuticFocus, { parent: string; therapist: string }> = {
  sensory_regulation: { parent: 'تنظيم الاستجابة الحسية والهدوء', therapist: 'معالجة متعددة الأنظمة، التنظيم الذاتي لمستوى الإثارة' },
  motor_planning: { parent: 'التفكير قبل الحركة والتنفيذ بالترتيب', therapist: 'التخطيط الحركي، التسلسل الحركي، الذاكرة الحركية' },
  executive_function: { parent: 'الترتيب والخطة والتنفيذ دون تخطي خطوات', therapist: 'التخطيط، التنظيم، الذاكرة العاملة، كبح الاندفاع' },
  fine_motor: { parent: 'التحكم بالأصابع واليد والحركة الدقيقة', therapist: 'الحركة الدقيقة، القبضة الوظيفية، التنسيق البصري الحركي' },
  gross_motor: { parent: 'حركة الجسم الكبيرة والتوازن', therapist: 'الحركة الكلية، التوازن الديناميكي، التكامل الحسي الحركي' },
  bilateral_coordination: { parent: 'استخدام اليدين معاً بتنسيق', therapist: 'التنسيق الثنائي، تكامل نصفي الجسم' },
};

const SUGGESTED_DURATION: Record<TherapeuticFocus, { parent: string; therapist: string }> = {
  sensory_regulation: { parent: 'ثلاث إلى خمس دقائق', therapist: '٥–٨ دقائق حسب مستوى الإثارة' },
  motor_planning: { parent: 'أربع إلى ست دقائق', therapist: '٦–١٠ دقائق مع التكرار' },
  executive_function: { parent: 'خمس إلى ثماني دقائق', therapist: '٨–١٢ دقيقة حسب تعقيد التسلسل' },
  fine_motor: { parent: 'أربع إلى سبع دقائق', therapist: '٦–١٠ دقائق' },
  gross_motor: { parent: 'خمس إلى ثماني دقائق', therapist: '٨–١٢ دقيقة' },
  bilateral_coordination: { parent: 'أربع إلى ست دقائق', therapist: '٦–١٠ دقائق' },
};

/** Age-scaled duration: shorter for younger children, clearer alignment to developmental level. */
function getSuggestedDurationForAge(focus: TherapeuticFocus, userMode: UserMode, age: number): string {
  const base = SUGGESTED_DURATION[focus][userMode];
  if (age < 4) {
    const short: Record<TherapeuticFocus, string> = {
      sensory_regulation: userMode === 'parent' ? 'دقيقتان إلى أربع دقائق' : '٣–٥ دقائق',
      motor_planning: userMode === 'parent' ? 'دقيقتان إلى أربع دقائق' : '٤–٦ دقائق',
      executive_function: userMode === 'parent' ? 'ثلاث إلى خمس دقائق' : '٥–٨ دقائق',
      fine_motor: userMode === 'parent' ? 'دقيقتان إلى أربع دقائق' : '٤–٦ دقائق',
      gross_motor: userMode === 'parent' ? 'ثلاث إلى خمس دقائق' : '٥–٨ دقائق',
      bilateral_coordination: userMode === 'parent' ? 'دقيقتان إلى أربع دقائق' : '٤–٦ دقائق',
    };
    return short[focus];
  }
  if (age < 7) return base;
  return base;
}

/** Pick a variant by seed (stable per activity). Ensures variation across activities. */
function pickVariant<T>(options: readonly T[], seed: number): T {
  return options[Math.abs(seed) % options.length];
}

/** Therapeutic reasoning: varied, non-repetitive rationale per focus/mode. */
const CLINICAL_RATIONALE: Record<TherapeuticFocus, { parent: readonly string[]; therapist: readonly string[] }> = {
  sensory_regulation: {
    parent: [
      'العنصر الموجود في الصورة يوفّر فرصة لاستكشاف هادئ يساعد طفلك على تنظيم إثارته.',
      'الاعتماد على شيء مألوف يقلّل الحِمل الحسي ويسهّل التركيز والهدوء.',
      'لمس ومشاهدة العنصر في مكانه يعزّز الشعور بالأمان ويُهدئ الجهاز الحسي.',
    ],
    therapist: [
      'العنصر البيئي يوفّر مدخلات لمسية وبصرية قابلة للضبط؛ مناسب لتدخل تنظيم ذاتي متعدد الأنظمة.',
      'المهمة تدعم معالجة الإثارة وتدريج التحمل دون إغراق حسي.',
      'السياق البيئي المألوف يزيد التعميم ويقلّل القلق المصاحب للأنشطة الحسية.',
    ],
  },
  motor_planning: {
    parent: [
      'التفكير في الخطوات قبل التنفيذ ثم تنفيذها بالترتيب يقوّي التخطيط الحركي عند طفلك.',
      'وجود هدف واضح (العنصر أو نقطة الوصول) يقلّل التردد ويدعم تنفيذ متسلسل.',
      'النشاط يربط بين ما يراه الطفل في الغرفة وبين خطة حركية قابلة للتطبيق.',
    ],
    therapist: [
      'المسار من البداية إلى الهدف يفرض تمثيلاً حركياً وتسلسلاً قابلاً للملاحظة والتدرج.',
      'النشاط يناسب قياس الذاكرة الحركية والمرونة في تعديل الخطة عند الطلب.',
      'التكرار مع تغيير بسيط في الخطة يدعم البرمجة الحركية دون روتين جامد.',
    ],
  },
  executive_function: {
    parent: [
      'ترتيب العناصر ثم تنفيذ الترتيب يمرّن التخطيط وكبح الاندفاع والتحقق من الخطوات.',
      'وضع خطة قبل اللمس أو النقل يدعم الوظائف التنفيذية في سياق يومي.',
      'النشاط يعزّز «التفكير ثم الفعل» وعدم تخطي الخطوات.',
    ],
    therapist: [
      'المهمة قابلة للتدرج (عدد العناصر، قواعد الترتيب، كتابة الخطة) وتناسب تقييم التخطيط والذاكرة العاملة.',
      'ترتيب عناصر من البيئة ثم تنفيذها يعزّز كبح الاندفاع والمرونة المعرفية.',
      'استدعاء ما تم تنفيذه من الذاكرة يدعم الذاكرة العاملة والمراقبة الذاتية.',
    ],
  },
  fine_motor: {
    parent: [
      'التعامل مع العنصر يتطلب تحكماً دقيقاً بالأصابع واليد، مما يقوّي الحركة الدقيقة.',
      'حجم وموقع العنصر يحددان متطلبات طبيعية للقبضة والتنسيق دون ضغط.',
      'النشاط يدعم التنسيق بين العين واليد في سياق مألوف.',
    ],
    therapist: [
      'العنصر يسمح بتطبيق قبضة وظيفية وتحكم رأسي/دوراني وتنسيق بصري حركي قابلة للقياس.',
      'المهمة قابلة للترقية (حجم الهدف، المسافة، مدة التثبيت، فصل الأصابع) حسب المستوى.',
      'السياق البيئي يوفّر تحميلاً وظيفياً للحركة الدقيقة بدل تمارين معزولة.',
    ],
  },
  gross_motor: {
    parent: [
      'المشي نحو العنصر والوقوف بجانبه يمرّن التوازن والحركة الكبيرة في بيئة حقيقية.',
      'استخدام العنصر كهدف مكاني يجعل النشاط واضحاً ومفيداً للثبات والتوازن.',
      'النشاط يدعم وعي الطفل بجسمه ومكانه في الغرفة.',
    ],
    therapist: [
      'العنصر كهدف مكاني يوفّر سياقاً للحركة الكلية والتوازن الديناميكي والوعي الوضعي.',
      'المسافة وعدد الخطوات ووقت رفع الرجل قابلة للتعديل حسب العمر والتحمل.',
      'النشاط يناسب قياس جودة المشي والوضعية والمرونة في تغيير الاتجاه.',
    ],
  },
  bilateral_coordination: {
    parent: [
      'تثبيت العنصر بيد والتنفيذ بالأخرى ثم النقل بيدين معاً يمرّن التعاون بين اليدين.',
      'حجم العنصر ووزنه يحددان متطلبات مناسبة للتنسيق الثنائي دون إجهاد.',
      'النشاط يدعم المهارات التي يحتاجها الطفل في اللبس والأكل واللعب.',
    ],
    therapist: [
      'النشاط يطبّق ثبات اليد غير المهيمنة وتنفيذ اليد المهيمنة والتبديل على عنصر بيئي قابل للتدرج.',
      'مدة التثبيت وعدد التكرارات ومسافة النقل قابلة للتعديل لقياس التنسيق الثنائي.',
      'المهمة تعزّز التكامل بين نصفي الجسم في سياق وظيفي.',
    ],
  },
};

/** Suggested progression: ترقية / تخفيض — varied wording per focus. */
const SUGGESTED_PROGRESSION: Record<TherapeuticFocus, readonly string[]> = {
  sensory_regulation: [
    'ترقية: إطالة مدة الاستكشاف أو إشراك حاسة إضافية؛ تخفيض: تقصير المدة والاكتفاء باللمس والنظر.',
    'ترقية: دمج تنفس منظم أطول؛ تخفيض: لمس ونظر فقط دون عدّ.',
    'للتسهيل: بيئة هادئة جداً وحاسة واحدة؛ للتعقيد: ضجيج خفيف أو إضاءة متغيرة مع الحفاظ على التنظيم.',
  ],
  motor_planning: [
    'ترقية: مسافة أطول أو خطوات إضافية أو مسار متعرج؛ تخفيض: متر واحد وخطوة واحدة مع تلميحات.',
    'ترقية: تغيير الخطة في منتصف المسار؛ تخفيض: نقل بسيط من يد ليد مع توجيه لفظي.',
    'للتسهيل: علامات بصرية على الأرض؛ للتعقيد: عدم وجود علامات والاعتماد على التخطيط الذهني.',
  ],
  executive_function: [
    'ترقية: زيادة عدد العناصر أو إضافة قاعدة (حجم، لون) أو كتابة الخطة؛ تخفيض: عنصران مع صور توضيحية.',
    'ترقية: ترتيب من الذاكرة بعد التنفيذ؛ تخفيض: ترتيب شفهي مع إشارة إلى كل عنصر.',
    'للتسهيل: تلميحات لفظية أثناء التخطيط؛ للتعقيد: قواعد متعددة (مثلاً: من الأصغر للأكبر ثم حسب اللون).',
  ],
  fine_motor: [
    'ترقية: هدف أصغر أو مسافة أبعد أو قبضة أدق (إبهام–سبابة)؛ تخفيض: دائرة أكبر وقبضة كاملة ووقت أقصر.',
    'ترقية: مدة تثبيت أطول وحركات أصابع منفصلة؛ تخفيض: ثلاث ثوانٍ وهدف كبير ومسافة قصيرة.',
    'للتسهيل: دعم يدوي خفيف عند الحاجة؛ للتعقيد: عدم استخدام الدعم وزيادة الدقة المطلوبة.',
  ],
  gross_motor: [
    'ترقية: زيادة عدد الخطوات أو مدة رفع الرجل أو إضافة خطوة جانبية؛ تخفيض: خطوتان وثلاث ثوانٍ رفع مع دعم.',
    'ترقية: مشي خلفي أو جانبي؛ تخفيض: وقوف ثابت بجانب العنصر مع لمس خفيف للاتزان.',
    'للتسهيل: مسافة قصيرة وسطح مستوٍ؛ للتعقيد: مسافة أطول أو سطح غير مستوٍ (بحذر).',
  ],
  bilateral_coordination: [
    'ترقية: حركات أعقد (دوران، نقر، دفع) ومسافة نقل أكبر؛ تخفيض: نقر فقط ومسافة قصيرة وتثبيت ثلاث ثوانٍ.',
    'ترقية: تبديل أدوار سريع وحركات متعددة؛ تخفيض: حركة واحدة بيد واحدة مع تثبيت بسيط باليد الأخرى.',
    'للتسهيل: عنصر خفيف وثابت؛ للتعقيد: عنصر يتطلب ضبطاً أدق مع زيادة عدد التكرارات.',
  ],
};

/** Environmental modification tips — varied phrasing. */
const ENV_TIPS_BY_FOCUS: Record<TherapeuticFocus, readonly string[]> = {
  sensory_regulation: [
    'تقليل الضجيج والإضاءة المزعجة؛ إبقاء العنصر في مكان مألوف.',
    'تهيئة ركن هادئ؛ تجنّب لمس مفاجئ أو حركة زائدة حول الطفل.',
    'إغلاق الباب أو تقليل المارة يقلّل التشويش الحسي.',
  ],
  motor_planning: [
    'إخلاء المسار من العوائق؛ وضع علامة واضحة لنقطة الوصول.',
    'تثبيت العنصر إن كان قابلاً للتحريك؛ تأمين مساحة كافية للدوران.',
    'علامات على الأرض تساعد الطفل على تخطيط المسار.',
  ],
  executive_function: [
    'سطح عمل منظم؛ جعل جميع العناصر مرئية دون فوضى.',
    'تقليل المشتتات البصرية؛ وضع العناصر في متناول اليد.',
    'ترتيب مبدئي بسيط يسهّل على الطفل اتباع الخطة.',
  ],
  fine_motor: [
    'ارتفاع سطح مريح (مستوى الكوع تقريباً)؛ إضاءة كافية؛ جلوس مستقر.',
    'تثبيت السطح؛ إبعاد أشياء قابلة للسقوط عن الحافة.',
    'كرسي وطاولة مناسبان يقلّلان الإجهاد ويدعمان الدقة.',
  ],
  gross_motor: [
    'أرضية غير زلقة؛ إزالة أجسام حادة أو هشة؛ مساحة خالية بقطر نحو ٣ م.',
    'ثبات العنصر؛ عدم وجود عوائق بين نقطة البداية والهدف.',
    'حذاء مريح وسطح مستوٍ يدعمان التوازن والمشي الآمن.',
  ],
  bilateral_coordination: [
    'سطح ثابت وارتفاع مريح؛ جلوس مع ظهر مستقيم وقدمين على الأرض.',
    'إبعاد العنصر عن حافة الطاولة؛ مساحة كافية لحركة اليدين.',
    'وضعية جلوس صحيحة تقلّل الإجهاد وتدعم التنسيق.',
  ],
};

/** Functional outcome — daily-life link; varied wording. */
const FUNCTIONAL_OUTCOME: Record<TherapeuticFocus, readonly string[]> = {
  sensory_regulation: [
    'انتقال أسهل إلى مهام تتطلب تركيزاً؛ تنظيم أفضل للإثارة في المواقف اليومية.',
    'تحمّل أفضل في الأماكن المزدحمة أو الصاخبة؛ استجابة أكثر هدوءاً للمؤثرات.',
    'قدرة أكبر على الهدوء قبل النوم أو قبل الواجبات.',
  ],
  motor_planning: [
    'تنفيذ مهام متعددة الخطوات (لبس، ترتيب الغرفة) بثقة أكبر.',
    'تقليل التردد أو «التجميد» عند بدء حركة معقدة.',
    'مشاركة أوضح في الألعاب التي تتطلب تخطيطاً (مثل بناء مسار ثم السير فيه).',
  ],
  executive_function: [
    'إكمال تسلسلات يومية (روتين الصباح، الواجبات) دون تخطي خطوات.',
    'تحسين التخطيط والترتيب في المهام المدرسية أو المنزلية.',
    'كبح اندفاع أفضل وانتظار الدور في اللعب الجماعي.',
  ],
  fine_motor: [
    'تحكم أفضل في الأكل والكتابة وربط الأزرار واستخدام الأدوات.',
    'دقة أكبر في الأنشطة التي تتطلب تنسيق عين–يد (قص، لصق، رسم).',
    'استقلالية أكبر في ارتداء الملابس والأحذية ذات الأزرار أو السحاب.',
  ],
  gross_motor: [
    'توازن ومشي أكثر استقراراً؛ مشاركة أفضل في اللعب والرياضة.',
    'وعي أوضح بموضع الجسم في الفضاء (صعود الدرج، تجنّب الاصطدام).',
    'ثبات وضعي أفضل أثناء الجلوس والوقوف واللعب.',
  ],
  bilateral_coordination: [
    'استخدام اليدين معاً في القص واللبس وفتح العلب والألعاب البناءة.',
    'ثبات أفضل عند تثبيت ورقة أثناء الكتابة أو وعاء أثناء التحريك.',
    'مهارات يومية مثل فتح العلب وارتداء الجوارب تتحسّن مع التمرين.',
  ],
};

/** Environmental adaptation — varied, natural phrasing. No repeated stock phrases. */
const ENV_ADAPTATION_VARIANTS: readonly string[] = [
  'يمكن تنفيذ النشاط مع الإبقاء على العنصر في مكانه المعتاد.',
  'النشاط مصمّم ليتناسب مع موقع العنصر الحالي دون الحاجة لنقله.',
  'استفيدوا من وجود العنصر كما هو في الغرفة مع التأكد من عدم وجود عوائق.',
  'لا حاجة لتغيير ترتيب الغرفة؛ النشاط يعتمد على ما هو متوفر.',
  'البيئة الحالية مناسبة؛ تأكد فقط من إتاحة مساحة آمنة حول العنصر.',
  'النشاط قابل للتطبيق مباشرة في المكان الذي يوجد فيه العنصر.',
];

/** Context-specific tips (space/stability/height) — phrased differently each time. */
function getEnvironmentalAdaptationPhrase(element: EnvironmentElement | undefined, objectLabelArabic: string, variantSeed: number): string {
  if (!element) {
    const fallbacks = [
      `استخدم ${objectLabelArabic} كما يظهر في بيئة الطفل.`,
      `النشاط يعتمد على ${objectLabelArabic} المتوفر في المكان.`,
    ];
    return fallbacks[Math.abs(variantSeed) % fallbacks.length];
  }
  const parts: string[] = [];
  if (element.space === 'constrained') {
    const opts = ['توفير هامش كافٍ حول العنصر يسهّل الحركة.', 'إخلاء المساحة القريبة يجعل النشاط مريحاً.'];
    parts.push(opts[variantSeed % opts.length]);
  }
  if (element.stability === 'mobile') {
    const opts = ['إن كان العنصر يتحرك بسهولة، ثبّته قليلاً أثناء النشاط.', 'تثبيت العنصر يمنع الانزلاق ويضمن أمان التنفيذ.'];
    parts.push(opts[(variantSeed + 1) % opts.length]);
  }
  if (element.height === 'elevated') {
    const opts = ['انتبه للارتفاع وتجنّب الوقوف على سطح غير مستقر.', 'مراعاة مستوى الارتفاع يقلّل خطر السقوط.'];
    parts.push(opts[(variantSeed + 2) % opts.length]);
  }
  if (parts.length > 0) return parts.join(' ');
  return ENV_ADAPTATION_VARIANTS[Math.abs(variantSeed) % ENV_ADAPTATION_VARIANTS.length];
}

/** Single-pass therapeutic reasoning: returns rationale, progression, env tips, functional outcome, env adaptation. */
function getTherapeuticReasoning(
  activity: Activity,
  userMode: UserMode,
  variantSeed: number,
  objectLabelArabic: string
): {
  clinicalRationale: string;
  suggestedProgression: string;
  environmentalModificationTips: string;
  functionalOutcome: string;
  environmentalAdaptation: string;
} {
  const focus = activity.therapeuticFocus;
  const rationalePool = CLINICAL_RATIONALE[focus][userMode];
  const progressionPool = SUGGESTED_PROGRESSION[focus];
  const envTipsPool = ENV_TIPS_BY_FOCUS[focus];
  const outcomePool = FUNCTIONAL_OUTCOME[focus];
  const baseEnvTips = pickVariant(envTipsPool, variantSeed);
  const riskSuffix = activity.element?.risks?.length ? ' ' + activity.element.risks.join('؛ ') : '';
  return {
    clinicalRationale: pickVariant(rationalePool, variantSeed),
    suggestedProgression: pickVariant(progressionPool, variantSeed),
    environmentalModificationTips: baseEnvTips + riskSuffix,
    functionalOutcome: pickVariant(outcomePool, variantSeed),
    environmentalAdaptation: getEnvironmentalAdaptationPhrase(activity.element, objectLabelArabic, variantSeed),
  };
}

/** Instructional openers — varied so the same phrase is not repeated. */
const INSTRUCTIONAL_PLACE = {
  parent: ['اجعل', 'ضع', 'قدّم', 'استخدم', 'وفّر'] as const,
  therapist: ['تهيئة البيئة: وضع', 'تهيئة المهمة: استخدام', 'إعداد المساحة: وضع', 'تحضير السياق: إتاحة'] as const,
};

/** Encouragement phrasing — varied, warm tone. */
const ENCOURAGEMENT = [
  'انتبه معه للقوام والشعور — ',
  'شجّعه على ملاحظة القوام والشعور — ',
  'دعّه يركّز على القوام والشعور — ',
  'رافقه في الانتباه للقوام والشعور — ',
  'يمكنك أن تذكّره بالتنفس الهادئ — ',
] as const;

/** Format types for diversity: حركي، تحدٍّ معرفي، لعب إبداعي، مهمة تعاونية — يغيّر صياغة التقديم دون تغيير المحتوى العلاجي */
const FORMAT_TYPE_LABELS = [
  'نشاط حركي منظم',
  'تحدٍّ معرفي وحركي',
  'لعب هادف وإبداعي',
  'مهمة تعاونية موجّهة',
] as const;

/** Step transitions — تنويع الربط بين الخطوات لتجنّب التكرار */
const STEP_TRANSITION = [
  { next: 'ثمّ ', after: '؛ بعد ذلك ' },
  { next: 'الخطوة التالية: ', after: '؛ عند الانتهاء ' },
  { next: 'بعد ذلك ', after: '؛ ثمّ ينتقل إلى ' },
  { next: 'يلي ذلك ', after: '؛ في المرحلة التالية ' },
  { next: 'ثمّ ', after: '؛ يتوقّف قليلاً ثمّ ' },
] as const;

/** Age-band phrasing: simpler for young, richer for older — لغة وعبارات حسب العمر */
const AGE_BAND_OPENERS = {
  young: ['ابدأ بـ', 'أولاً ', 'ثمّ ', 'أخيراً '],
  mid: ['في البداية ', 'ثمّ ', 'بعد ذلك ', 'في الختام '],
  older: ['المرحلة الأولى: ', 'المرحلة الثانية: ', 'المرحلة الثالثة: ', 'المرحلة الأخيرة: '],
} as const;

/** Age alignment suffix variants — تجنّب عبارة واحدة متكررة */
const AGE_ALIGNMENT_SUFFIX = [
  'النشاط معدّل للفئة العمرية المُدخلة.',
  'تمّ ضبط الصعوبة والطول حسب عمر الطفل.',
  'المحتوى والخطوات مناسبان للعمر المُدخل.',
] as const;

/** Parent: short, warm goal framing. Therapist: professional therapeutic, precise. */
const GOAL_FRAME_PARENT = [
  'لمساعدة طفلك على',
  'يدعم طفلك في',
  'لمساعدة الطفل على',
] as const;

const GOAL_FRAME_THERAPIST = [
  'تحسين',
  'تعزيز',
  'تنمية',
] as const;

/** Activity name variants (parent) — عناوين متنوعة، لغة بسيطة وداعمة، تجنّب التكرار */
const ACTIVITY_NAMES_PARENT: Record<TherapeuticFocus, readonly string[]> = {
  sensory_regulation: ['تهدئة الحواس مع', 'تنظيم حسي مع', 'استكشاف هادئ لـ', 'هدوء وحواس مع', 'لحظة تركيز مع', 'استكشاف لمسي وبصري لـ'],
  motor_planning: ['التفكير ثم التنفيذ مع', 'تخطيط ثم حركة مع', 'خطة قبل خطوة مع', 'تفكير ثم حركة مع', 'مسار وخطة مع', 'تنفيذ متسلسل مع'],
  executive_function: ['ترتيب وخطة مع', 'تسلسل ومنفذ مع', 'تنظيم وتنفيذ مع', 'خطة وترتيب مع', 'ترتيب ذهني مع', 'تنفيذ مراقَب مع'],
  fine_motor: ['اليد والأصابع مع', 'حركة دقيقة مع', 'تحكم يدوي مع', 'أصابع وتركيز مع', 'قبضة وتنسيق مع', 'تركيز يدوي مع'],
  gross_motor: ['حركة الجسم والتوازن مع', 'توازن وحركة مع', 'جسم متوازن مع', 'مشي وتوازن مع', 'تنقل وتوازن مع', 'حركة آمنة مع'],
  bilateral_coordination: ['اليدان معاً مع', 'تنسيق ثنائي مع', 'يدان متعاونتان مع', 'تعاون اليدين مع', 'ثبات وتنفيذ مع', 'تعاون يدوي مع'],
};

/** Activity name variants (therapist) — عناوين علاجية احترافية متنوّعة */
const ACTIVITY_NAMES_THERAPIST: Record<TherapeuticFocus, readonly string[]> = {
  sensory_regulation: ['تدخل تنظيم حسي وتكامل حسي باستخدام', 'تدخل معالجة حسية متعددة الأنظمة باستخدام', 'تدخل تنظيم ذاتي وإثارة باستخدام', 'تدخل استكشاف حسي هادف باستخدام'],
  motor_planning: ['تدخل تخطيط حركي وتسلسل حركي باستخدام', 'تدخل ذاكرة حركية ومرونة حركية باستخدام', 'تدخل تمثيل حركي وتنفيذ باستخدام', 'تدخل برمجة حركية متسلسلة باستخدام'],
  executive_function: ['تدخل مهارات تنفيذية ووظائف معرفية باستخدام', 'تدخل تخطيط وتنظيم وكبح اندفاع باستخدام', 'تدخل ذاكرة عاملة ومرونة معرفية باستخدام', 'تدخل تنفيذ مراقَب وتسلسل باستخدام'],
  fine_motor: ['تدخل حركة دقيقة وتنسيق يدوي باستخدام', 'تدخل قبضة وظيفية وتنسيق بصري حركي باستخدام', 'تدخل تحكم حركي دقيق باستخدام', 'تدخل تنسيق بصري حركي ووضع هدف باستخدام'],
  gross_motor: ['تدخل حركة كلية وتكامل حسي حركي باستخدام', 'تدخل توازن ديناميكي ووعي جسدي باستخدام', 'تدخل تكامل حسي حركي ووضعية باستخدام', 'تدخل مشي متحكم وتوازن باستخدام'],
  bilateral_coordination: ['تدخل تنسيق ثنائي وتكامل بين نصفي الجسم باستخدام', 'تدخل ثبات وتنفيذ ثنائي اليدين باستخدام', 'تدخل تخطيط حركي ثنائي باستخدام', 'تدخل تثبيت ثنائي ونقل مشترك باستخدام'],
};

/** Step opener variation (first verb in a step) — تنويع صيغ التوجيه */
const STEP_VERB = {
  place: ['ضع', 'اجعل', 'قدّم', 'استخدم'] as const,
  haveChild: ['ينفذ', 'يقوم بـ', 'ينجز', 'يؤدي'] as const,
};

/** Therapeutic goal full-sentence variants (parent) — صيغ متنوعة للهدف العلاجي، تجنّب العبارات النمطية */
const GOAL_VARIANTS_PARENT: Record<TherapeuticFocus, readonly string[]> = {
  sensory_regulation: [
    'مساعدة الطفل على تنظيم استجابته للمؤثرات الحسية والشعور بالهدوء',
    'دعم تنظيم الإثارة الحسية لدى الطفل ووصوله إلى حالة هدوء',
    'تعزيز معالجة الطفل للمدخلات الحسية بشكل منظم وهادئ',
    'تعويد الطفل على الاستكشاف اللمسي والبصري بوتيرة هادئة',
  ],
  motor_planning: [
    'تعويد الطفل على التفكير في الخطوات قبل الحركة وتنفيذها بالترتيب',
    'تنمية قدرة الطفل على وضع خطة حركية ثم تنفيذها خطوة بخطوة',
    'دعم التخطيط الحركي والتنفيذ المتسلسل دون تخطي خطوات',
    'تعزيز تمثيل المسار ذهنياً ثم تنفيذه مع التحقق عند كل خطوة',
  ],
  executive_function: [
    'تعزيز قدرة الطفل على وضع خطة وترتيب وتنفيذها دون تخطي خطوات',
    'تنمية التخطيط والتنظيم والتنفيذ بالترتيب مع كبح الاندفاع',
    'دعم الترتيب الذهني والتنفيذ المتسلسل والتحقق من كل خطوة',
    'تقوية الذاكرة العاملة عبر التخطيط ثم التنفيذ ثم الاستدعاء',
  ],
  fine_motor: [
    'تقوية تحكم الطفل بأصابعه ويديه وحركاته الدقيقة',
    'تنمية القبضة الوظيفية والتحكم الحركي الدقيق في اليدين',
    'تعزيز التنسيق بين العين واليد والحركات الصغيرة المنضبطة',
    'دعم الحركة المنفصلة للأصابع والوضع الدقيق داخل الهدف',
  ],
  gross_motor: [
    'تقوية حركة الجسم الكبيرة وتحقيق التوازن أثناء المشي والوقوف',
    'تنمية التوازن والحركة الكلية والثبات الوضعي',
    'دعم التكامل الحسي الحركي والوعي بالجسم والمكان',
    'تعزيز المشي المتحكم ورفع الرجل مع الحفاظ على التوازن',
  ],
  bilateral_coordination: [
    'تعويد الطفل على استخدام يديه معاً بتنسيق (ثبات إحداهما وعمل الأخرى)',
    'تنمية التنسيق الثنائي بين اليدين والعمل المتعاون لهما',
    'تعزيز ثبات اليد المساعدة وتنفيذ اليد المهيمنة مع التبديل',
    'دعم التثبيت بيد والتنفيذ بالأخرى ثم النقل بيدين معاً',
  ],
};

/** Therapeutic goal full-sentence variants (therapist) — صيغ علاجية احترافية متنوّعة */
const GOAL_VARIANTS_THERAPIST: Record<TherapeuticFocus, readonly string[]> = {
  sensory_regulation: [
    'تحسين معالجة المعلومات الحسية متعددة الأنظمة والتنظيم الذاتي لمستوى الإثارة',
    'تعزيز التكامل الحسي والتنظيم الذاتي ومستوى اليقظة',
    'تنمية معالجة المدخلات الحسية والاستجابة المتكيفة للإثارة',
    'تحسين مستوى اليقظة والاستجابة الهادئة للمؤثرات الحسية',
  ],
  motor_planning: [
    'تحسين التخطيط الحركي والتسلسل الحركي والذاكرة الحركية والمرونة في تعديل الخطة',
    'تعزيز تمثيل الحركة والتنفيذ المتسلسل والمرونة الحركية',
    'تنمية البرمجة الحركية والذاكرة الحركية وتعديل الخطة عند الطلب',
    'تحسين التمثيل الحركي للمسار ثم التنفيذ المراقَب مع التحقق بعد كل خطوة',
  ],
  executive_function: [
    'تحسين التخطيط والتنظيم والمرونة المعرفية والذاكرة العاملة وكبح الاندفاع',
    'تعزيز الوظائف التنفيذية والتخطيط والتنفيذ المراقَب والذاكرة العاملة',
    'تنمية كبح الاندفاع والتخطيط المتسلسل والتحقق من التنفيذ',
    'تحسين صياغة الخطة وتوثيقها ثم التنفيذ المتسلسل والاستدعاء من الذاكرة',
  ],
  fine_motor: [
    'تحسين الحركة الدقيقة والقبضة الوظيفية والتنسيق اليدوي والتنسيق البصري الحركي والتحكم الحركي',
    'تعزيز التنسيق البصري الحركي والتحكم في القبضة والحركات المنفصلة',
    'تنمية القبضة الثلاثية والتحكم الرأسي والدوراني ووضع الهدف بدقة',
    'تحسين التثبيت والقبضة الوظيفية ووضع العنصر داخل الهدف بدقة',
  ],
  gross_motor: [
    'تحسين الحركة الكلية والتوازن الديناميكي والتكامل الحسي الحركي والوعي المكاني والجسدي',
    'تعزيز التوازن الثابت والديناميكي والمشي الأمامي والخلفي والوضعية',
    'تنمية التكامل الحسي الحركي والوعي بالجسم والمشي المتحكم',
    'تحسين المشي المتحكم ورفع الرجل مع الحفاظ على التوازن والوضعية',
  ],
  bilateral_coordination: [
    'تحسين التنسيق الثنائي وتكامل نصفي الجسم والتخطيط الحركي الثنائي والتكامل الحسي',
    'تعزيز ثبات اليد غير المهيمنة وتنفيذ اليد المهيمنة والتبديل والتنسيق المركّب',
    'تنمية التثبيت الثنائي والتنفيذ بيد واحدة ونقل الجسم بيدين معاً',
    'تحسين التثبيت بقبضة وظيفية والتنفيذ باليد الأخرى ثم النقل المشترك',
  ],
};

// Object label translations: جميع الأسماء بالعربية فقط (لا كلمات إنجليزية في المخرجات)
const objectTranslations: Record<string, string> = {
  couch: 'كنبة',
  sofa: 'كنبة',
  chair: 'كرسي',
  table: 'طاولة',
  ball: 'كرة',
  bike: 'دراجة',
  bicycle: 'دراجة',
  swing: 'أرجوحة',
  puzzle: 'لغز',
  lego: 'ليغو',
  block: 'مكعب',
  cube: 'مكعب',
  book: 'كتاب',
  board: 'لوحة',
  card: 'بطاقة',
  stairs: 'درج',
  step: 'درجة',
  bench: 'مقعد',
  toy: 'لعبة',
  doll: 'دمية',
  car: 'سيارة',
  truck: 'شاحنة',
  train: 'قطار',
  plane: 'طائرة',
  phone: 'هاتف',
  computer: 'حاسوب',
  screen: 'شاشة',
  pillow: 'وسادة',
  blanket: 'بطانية',
  bed: 'سرير',
  desk: 'مكتب',
  lamp: 'مصباح',
  door: 'باب',
  window: 'نافذة',
  wall: 'جدار',
  floor: 'أرضية',
  carpet: 'سجادة',
  rug: 'سجادة',
  bookcase: 'خزانة كتب',
  wardrobe: 'خزانة ملابس',
  shelf: 'رف',
  stool: 'كرسي صغير',
  ottoman: 'مقعد قدمين',
  quilt: 'لحاف',
  teddy: 'دمية دب',
  laptop: 'حاسوب محمول',
  remote: 'جهاز تحكم',
  box: 'صندوق',
  basket: 'سلة',
  plant: 'نبات',
  vase: 'مزهرية',
  cushion: 'وسادة صغيرة',
  mattress: 'فراش',
  drawer: 'درج',
  cabinet: 'خزانة',
  bathtub: 'حوض استحمام',
  tub: 'حوض',
  toilet: 'مرحاض',
  sink: 'حوض غسيل',
  television: 'تلفزيون',
  tv: 'تلفزيون',
  monitor: 'شاشة',
  keyboard: 'لوحة مفاتيح',
  printer: 'طابعة',
  notebook: 'دفتر',
  envelope: 'ظرف',
  scissors: 'مقص',
  backpack: 'حقيبة ظهر',
  microwave: 'ميكروويف',
  refrigerator: 'ثلاجة',
  oven: 'فرن',
  toaster: 'محمصة',
  bowl: 'وعاء',
  plate: 'صحن',
  cup: 'كوب',
  towel: 'منشفة',
  mirror: 'مرآة',
  telephone: 'هاتف',
  cellular: 'هاتف خلوي',
  filing: 'خزانة ملفات',
  copier: 'آلة نسخ',
  modem: 'مودم',
  highchair: 'كرسي أطفال',
  'dining table': 'طاولة طعام',
  'coffee table': 'طاولة قهوة',
};

// Therapeutic focus translations
const therapeuticFocusTranslations: Record<TherapeuticFocus, { parent: string; therapist: string }> = {
  sensory_regulation: {
    parent: 'تهدئة الحواس والتنظيم الحسي',
    therapist: 'التنظيم الحسي والتكامل الحسي',
  },
  motor_planning: {
    parent: 'التفكير قبل الحركة (تخطيط حركي)',
    therapist: 'التخطيط الحركي والتسلسل الحركي',
  },
  executive_function: {
    parent: 'التخطيط والترتيب والتنفيذ',
    therapist: 'المهارات التنفيذية والوظائف المعرفية',
  },
  fine_motor: {
    parent: 'الحركة الدقيقة (يد وأصابع)',
    therapist: 'الحركة الدقيقة والتنسيق اليدوي',
  },
  gross_motor: {
    parent: 'حركة الجسم والتوازن',
    therapist: 'الحركة الكلية والتكامل الحسي الحركي',
  },
  bilateral_coordination: {
    parent: 'استخدام اليدين معاً',
    therapist: 'التنسيق الثنائي وتكامل نصفي الجسم',
  },
};

function translateObjectLabel(label: string): string {
  const lower = label.toLowerCase();
  const baseLabel = lower.split(',')[0].trim();
  
  // Check for direct match
  if (objectTranslations[baseLabel]) {
    return objectTranslations[baseLabel];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(objectTranslations)) {
    if (baseLabel.includes(key) || key.includes(baseLabel)) {
      return value;
    }
  }
  
  // No Arabic mapping: return the actual detected label (English) instead of a fixed placeholder
  return baseLabel.replace(/_/g, ' ');
}

function translateAgeDescriptor(age: number, userMode: UserMode): string {
  if (userMode === 'parent') {
    if (age < 4) return 'طفلك';
    if (age < 7) return 'طفلك';
    if (age < 11) return 'طفلك';
    return 'ابنك أو ابنتك';
  } else {
    if (age < 4) return 'الطفل';
    if (age < 7) return 'الطفل';
    if (age < 11) return 'الطفل';
    return 'الطفل';
  }
}

function formatActivityInArabic(
  activity: Activity,
  age: number,
  userMode: UserMode,
  variantSeed: number = 0,
  /** When provided, use this as the Arabic element name (finalized/cleaned) instead of translating from English. */
  objectLabelArabicOverride?: string
): ArabicFormattedActivity['formattedArabic'] {
  const objectLabelArabic = objectLabelArabicOverride ?? translateObjectLabel(activity.objectLabel);
  const ageDescriptor = translateAgeDescriptor(age, userMode);
  const envPhrase = activity.element
    ? getElementContextPhrase(activity.element, objectLabelArabic)
    : objectLabelArabic;
  const toolsUsed = activity.element
    ? `${objectLabelArabic} (من بيئة الطفل الظاهرة في الصورة)`
    : objectLabelArabic;
  const skillSeed = variantSeed + (activity.specificSkillSeed ?? 0);
  const targetSkill = activity.specificSkillSeed != null
    ? getSpecificSkillDefault(activity.therapeuticFocus, userMode, skillSeed)
    : TARGET_SKILL[activity.therapeuticFocus][userMode];
  const suggestedDuration = getSuggestedDurationForAge(activity.therapeuticFocus, userMode, age);

  const reasoning = getTherapeuticReasoning(activity, userMode, variantSeed, objectLabelArabic);

  const nameVariants = userMode === 'parent' ? ACTIVITY_NAMES_PARENT : ACTIVITY_NAMES_THERAPIST;
  const goalVariants = userMode === 'parent' ? GOAL_VARIANTS_PARENT : GOAL_VARIANTS_THERAPIST;

  let activityName = `${pickVariant(nameVariants[activity.therapeuticFocus], variantSeed)} ${objectLabelArabic}`;
  let therapeuticGoal = pickVariant(goalVariants[activity.therapeuticFocus], variantSeed);
  let implementationSteps: string[] = [];
  let ageAdaptations = '';
  let successIndicators = '';
  let safetyWarnings = '';
  const useSafeAlternatives = mustUseSafeAlternatives(activity.element);

  if (userMode === 'parent') {
    switch (activity.therapeuticFocus) {
      case 'sensory_regulation': {
        const template = variantSeed % 2;
        if (template === 0) {
          const placeVerb = pickVariant(STEP_VERB.place, variantSeed);
          const enc = pickVariant(ENCOURAGEMENT, variantSeed + 1);
          implementationSteps = [
            `${placeVerb} ${envPhrase} أمام ${ageDescriptor} على سطح مستوٍ وثابت`,
            `${enc}يلمس ${ageDescriptor} ${objectLabelArabic} بيديه عشر ثوانٍ`,
            `ينظر إلى ${objectLabelArabic} ويسمّي لونين على الأقل يراهما`,
            `يتنفس بعمق (أربع ثوانٍ شهيق، أربع زفير) وهو ينظر إلى ${objectLabelArabic}`,
            `أعدّ الخطوات من الثانية إلى الرابعة ثلاث مرات، مع راحة قصيرة بين كل مرة`,
          ];
        } else {
          implementationSteps = [
            `اجعل ${objectLabelArabic} في متناول ${ageDescriptor} في مكان هادئ`,
            `اطلب منه أن ينظر إليه أولاً ويقول ما لونه أو شكله (جملة واحدة تكفي)`,
            `ثم يلمسه بيديه بهدوء لمدة عشر ثوانٍ بينما تنفسه منتظم`,
            `كرّر «نظر ثم لمس ثم تنفس» مرتين أو ثلاثاً مع راحة بين كل جولة`,
          ];
        }
        ageAdaptations = age < 4
          ? 'اختصر المدة إلى خمس ثوانٍ؛ استخدم كلمتين فقط: «لمس» و«نظر»'
          : age < 7
            ? 'عدّ تنازلياً (٣، ٢، ١) قبل الانتقال من خطوة إلى أخرى'
            : 'دعه يصف القوام والألوان بتفصيل أكثر؛ زد المدة إلى خمس عشرة ثانية';
        successIndicators = `يلامس ${objectLabelArabic} بهدوء؛ يسمّي لونين أو يصفه؛ تنفسه عميق؛ يظل هادئاً حتى نهاية النشاط`;
        safetyWarnings = `تأكد أنّ ${objectLabelArabic} لا أجزاء صغيرة فيه ولا حادة؛ إن كان صغير السن فلا يضعه في فمه`;
        break;
      }
      case 'motor_planning': {
        if (useSafeAlternatives) {
          implementationSteps = [
            `بجانب ${objectLabelArabic} كما هي في مكانها؛ علّم على نقطة الوصول على بُعد مترين (دون تحريك ${objectLabelArabic})`,
            `يقف ${ageDescriptor} بجانب ${objectLabelArabic} وينظر إلى نقطة الوصول خمس ثوانٍ`,
            `يقول بصوت مسموع: «سأمشي حول ${objectLabelArabic}، أمشي خطوتين نحو الهدف، ثم أتوقف هناك»`,
            `ينفذ ما قاله خطوة بخطوة (التنقل بين البداية والوصول دون لمس أو تحريك ${objectLabelArabic})، ويتوقف بعد كل خطوة`,
            `كرّر النشاط ثلاث مرات؛ في المرة الثالثة غيّر الخطة (مثلاً: أربع خطوات بدل اثنتين)`
          ];
          ageAdaptations = age < 4
            ? 'اقصر المسافة على متر واحد؛ خطوة واحدة فقط؛ دلّه بيدك أو بإشارة واضحة'
            : age < 7
              ? 'خطوتان فقط؛ ذكّره بالخطة وهو ينفذ'
              : 'دعه يختار مساراً أصعب (مثلاً يدور حول شيء)؛ زد المسافة إلى ثلاثة أمتار';
          successIndicators = 'يذكر الخطة قبل أن يتحرك؛ ينفذ بالترتيب دون تحريك العنصر الثقيل؛ يتوقف بعد كل خطوة؛ يغيّر الخطة عندما تطلب منه';
          safetyWarnings = 'لا يرفع ولا يسحب ولا يدفع أي أثاث ثقيل؛ المسار خالٍ من العوائق؛ راقبه أثناء المشي حتى لا يعثر';
        } else {
          const placeVerb = pickVariant(STEP_VERB.place, variantSeed + 2);
          implementationSteps = [
            `${placeVerb} ${envPhrase} عند نقطة البداية، وعلّم على نقطة الوصول على بُعد مترين`,
            `يقف ${ageDescriptor} بجانب ${objectLabelArabic} وينظر إلى نقطة الوصول خمس ثوانٍ`,
            `يقول بصوت مسموع: «سأرفع ${objectLabelArabic}، أمشي خطوتين، ثم أضعه هناك»`,
            `ينفذ ما قاله خطوة بخطوة، ويتوقف بعد كل خطوة`,
            `كرّر النشاط ثلاث مرات؛ في المرة الثالثة غيّر الخطة (مثلاً: أربع خطوات بدل اثنتين)`
          ];
          ageAdaptations = age < 4
            ? 'اقصر المسافة على متر واحد؛ خطوة واحدة فقط؛ دلّه بيدك أو بإشارة واضحة'
            : age < 7
              ? 'خطوتان فقط؛ ذكّره بالخطة وهو ينفذ'
              : 'دعه يختار مساراً أصعب (مثلاً يدور حول شيء)؛ زد المسافة إلى ثلاثة أمتار';
          successIndicators = 'يذكر الخطة قبل أن يتحرك؛ ينفذ بالترتيب؛ يتوقف بعد كل خطوة؛ يغيّر الخطة عندما تطلب منه';
          safetyWarnings = 'المسار بين نقطة البداية والوصول خالٍ من العوائق؛ راقبه أثناء المشي حتى لا يعثر';
        }
        break;
      }
      case 'executive_function': {
        if (useSafeAlternatives) {
          implementationSteps = [
            `بجانب ${objectLabelArabic} (في مكانها دون تحريكها) ضع وسائد أو أشياء صغيرة قابلة للنقل على الأرض أو على الطاولة`,
            `ينظر ${ageDescriptor} إلى ${objectLabelArabic} وإلى الأشياء الصغيرة عشر ثوانٍ دون أن يلمسها`,
            `يحدد ترتيب اللمس أو الوصول: «أولاً ألمس ${objectLabelArabic}، ثانياً الوسادة، ثالثاً السجادة» (أو حسب ما وضعته)`,
            `ينفذ الترتيب كما قال (لمس أو الوصول فوق/حول دون رفع أو سحب ${objectLabelArabic})؛ يتوقف بعد كل خطوة ويتحقق`,
            `بعد الانتهاء يروي بالترتيب ماذا فعل (من ذاكرته دون النظر)`
          ];
          ageAdaptations = age < 4
            ? 'عنصران فقط (لمس أو إشارة)؛ استخدم صوراً توضح الترتيب؛ قلّل وقت النظر إلى خمس ثوانٍ'
            : age < 7
              ? 'ثلاثة عناصر؛ ساعده بلفظ الترتيب وهو يخطّط'
              : 'أربعة أو خمسة عناصر؛ يمكنه أن يكتب الترتيب أوّلاً؛ لا نقل لأثاث ثقيل';
          successIndicators = 'يحدد الترتيب قبل أن يبدأ؛ ينفذ بنفس الترتيب دون تحريك الأثاث الثقيل؛ يتوقف ويتحقق بعد كل خطوة؛ يروي ما فعله بعد الانتهاء';
          safetyWarnings = 'لا يرفع ولا يسحب الأثاث الثقيل؛ استخدم فقط أشياء صغيرة قابلة للنقل أو اللمس؛ راقبه حتى لا يسقط شيئاً';
        } else {
          const placeVerb = pickVariant(STEP_VERB.place, variantSeed + 3);
          implementationSteps = [
            `${placeVerb} ${envPhrase} وثلاثة أشياء أخرى من البيئة على سطح العمل دون ترتيب معين`,
            `ينظر ${ageDescriptor} إلى كل الأشياء عشر ثوانٍ دون أن يلمسها`,
            `يحدد الترتيب: «أولاً ${objectLabelArabic}، ثانياً كذا، ثالثاً كذا، أخيراً كذا»`,
            `ينفذ الترتيب كما قال؛ يتوقف بعد كل شيء ويتحقق أنّه في مكانه`,
            `بعد الانتهاء يروي بالترتيب ماذا فعل (من ذاكرته دون النظر)`
          ];
          ageAdaptations = age < 4
            ? 'عنصران فقط؛ استخدم صوراً توضح الترتيب؛ قلّل وقت النظر إلى خمس ثوانٍ'
            : age < 7
              ? 'ثلاثة عناصر؛ ساعده بلفظ الترتيب وهو يخطّط'
              : 'أربعة أو خمسة عناصر؛ يمكنه أن يكتب الترتيب أوّلاً؛ أضف قاعدة (مثلاً: من الأصغر للأكبر)';
          successIndicators = 'يحدد الترتيب قبل أن يبدأ؛ ينفذ بنفس الترتيب؛ يتوقف ويتحقق بعد كل خطوة؛ يروي ما فعله بعد الانتهاء';
          safetyWarnings = 'كل العناصر آمنة (لا قطع صغيرة)؛ راقبه حتى لا يسقط شيئاً';
        }
        break;
      }
      case 'fine_motor': {
        const fineTemplate = variantSeed % 2;
        if (useSafeAlternatives) {
          if (fineTemplate === 0) {
            implementationSteps = [
              `بجانب ${objectLabelArabic} كما هي في مكانها؛ ضع وسادة صغيرة أو سجادة على الأرض بجانبها إن أمكن`,
              `يمسك ${ageDescriptor} الوسادة أو يلمس سطح ${objectLabelArabic} بيده (الإبهام والسبابة والوسطى) دون رفع ${objectLabelArabic}`,
              `يتتبع بحواف أصابعه حواف ${objectLabelArabic} أو الوسادة خمس ثوانٍ`,
              `يدير الوسادة نصف دورة ببطء إن أمكن؛ أو يضع أصابعه داخل دائرة مرسومة على بُعد نحو ٣٠ سم`,
              `يكرر التتبع أو الوضع ثلاث مرات مع الحفاظ على الوضعية`,
            ];
          } else {
            implementationSteps = [
              `ضع وسادة صغيرة أو شيئاً آمناً بجانب ${objectLabelArabic} (بدون تحريك ${objectLabelArabic})`,
              `اطلب من ${ageDescriptor} أن يلمس السطح بأطراف أصابعه فقط لمدة خمس ثوانٍ`,
              `ثم يرسم بإصبعه دائرة في الهواء حول العنصر (أو حول الوسادة) ببطء`,
              `أخيراً يضع إصبعه داخل دائرة مرسومة على الورق أو الأرض على بُعد ٣٠ سم`,
              `كرّر مرة أو مرتين بحسب تحمّله`,
            ];
          }
          ageAdaptations = age < 4
            ? 'يستخدم كل الأصابع؛ ثلاث ثوانٍ؛ دائرة أكبر (قطر ١٠ سم)'
            : age < 7
              ? 'قبضة بثلاث أصابع؛ دائرة متوسطة (٧ سم)'
              : 'تتبع أدق؛ دائرة أصغر (٥ سم)؛ زد المسافة إلى ٤٠ سم';
          successIndicators = `يلامس أو يتتبع بدون رفع ${objectLabelArabic}؛ يثبت خمس ثوانٍ؛ يضع داخل الدائرة بدقة؛ ظهره مستقيم`;
          safetyWarnings = `لا يرفع ولا يحرّك ${objectLabelArabic}؛ استخدم وسادة أو لمس السطح فقط؛ راقب الوضعية`;
        } else {
          if (fineTemplate === 0) {
            const placeVerb = pickVariant(STEP_VERB.place, variantSeed + 4);
            implementationSteps = [
              `${placeVerb} ${envPhrase} على سطح ثابت بارتفاع مريح لـ${ageDescriptor}`,
              `يمسك ${objectLabelArabic} بيده (الإبهام والسبابة والوسطى)`,
              `يرفعه ببطء إلى مستوى كتفه ويثبته خمس ثوانٍ`,
              `يديره نصف دورة ببطء ثم يعيده كما كان`,
              `يضعه داخل دائرة مرسومة على بُعد نحو ٣٠ سم`,
            ];
          } else {
            implementationSteps = [
              `اجعل ${objectLabelArabic} على سطح ثابت أمام ${ageDescriptor} بارتفاع مريح`,
              `يلمس ${ageDescriptor} العنصر ويوصف قوامه (ناعم، خشن، بارد...) ثم يمسكه بالقبضة المناسبة`,
              `يرفعه ببطء ويثبته خمس ثوانٍ ثم يضعه داخل هدف مرسوم (دائرة قطرها ٥–٧ سم) على بُعد ٣٠ سم`,
              `كرّر مرتين أو ثلاثاً مع الحفاظ على الجلوس المستقيم`,
            ];
          }
          ageAdaptations = age < 4
            ? 'قبضة كاملة؛ ثلاث ثوانٍ؛ دائرة أكبر (١٠ سم)'
            : age < 7
              ? 'قبضة بثلاث أصابع؛ دائرة ٧ سم'
              : 'قبضة أدق؛ دائرة ٥ سم؛ مسافة ٤٠ سم';
          successIndicators = `يمسك بالقبضة المناسبة؛ يرفع ${objectLabelArabic} ثابتاً خمس ثوانٍ؛ يضعه داخل الدائرة بدقة`;
          safetyWarnings = `تأكد أنّ ${objectLabelArabic} غير ثقيل ولا حاد؛ جلوس أو وقوف وظهر مستقيم`;
        }
        break;
      }
      case 'gross_motor': {
        const grossTemplate = variantSeed % 2;
        if (useSafeAlternatives) {
          if (grossTemplate === 0) {
            implementationSteps = [
              `بجانب ${objectLabelArabic} كما هي في مكانها؛ تأكد من مكان فارغ على الأرض للتنقل`,
              `يقف ${ageDescriptor} على بُعد خطوتين من ${objectLabelArabic}، قدماه بعرض الكتفين`,
              `يمشي ببطء نحو ${objectLabelArabic} أربع خطوات (حول أو بين دون صعود أو دفع)؛ ظهره مستقيم`,
              `عند الوصول يضع يداً واحدة على ${objectLabelArabic} لدعم خفيف ويرفع رجلاً واحدة ويبقى متوازناً خمس ثوانٍ`,
              `يمشي للخلف أربع خطوات إلى حيث بدأ ونظره إلى ${objectLabelArabic}`,
            ];
          } else {
            implementationSteps = [
              `تأكد من مساحة فارغة قريبة من ${objectLabelArabic} (بدون تحريكه)`,
              `اطلب من ${ageDescriptor} الوقوف ثم العدّ «واحد، اثنان، ثلاثة» والمشي ثلاث خطوات نحو العنصر`,
              `عند الوصول يلمس ${objectLabelArabic} بيد واحدة فقط ويرفع الرجل الأخرى عدّة ثوانٍ`,
              `ثم يعود خطوة خطوة إلى نقطة البداية`,
            ];
          }
          ageAdaptations = age < 4
            ? 'خطوتان فقط؛ رفع الرجل ثلاث ثوانٍ؛ يمكنك مسك يده إن احتاج'
            : age < 7
              ? 'ثلاث خطوات؛ رفع الرجل أربع ثوانٍ؛ راقب توازنه'
              : 'ست خطوات؛ رفع الرجل سبع ثوانٍ؛ يمكن إضافة خطوة جانبية';
          successIndicators = 'يمشي بخطوات مستقرة دون صعود على الأثاث؛ يحافظ على التوازن عند رفع الرجل؛ يرجع للخلف دون أن يفقد توازنه؛ وضعه صحيح';
          safetyWarnings = 'لا يصعد على الأثاث ولا يدفعها؛ المكان خالٍ من العوائق؛ الأرض غير زلقة؛ راقبه من قرب';
        } else {
          if (grossTemplate === 0) {
            const placeVerb = pickVariant(STEP_VERB.place, variantSeed + 5);
            implementationSteps = [
              `${placeVerb} ${envPhrase} في منتصف مكان فارغ (نحو مترين في الاتجاهين)`,
              `يقف ${ageDescriptor} على بُعد خطوتين من ${objectLabelArabic}، قدماه بعرض الكتفين`,
              `يمشي ببطء نحو ${objectLabelArabic} أربع خطوات؛ ظهره مستقيم ومتوازن`,
              `عند الوصول يرفع رجلاً واحدة ويبقى متوازناً خمس ثوانٍ بجانب ${objectLabelArabic}`,
              `يمشي للخلف أربع خطوات إلى حيث بدأ؛ ونظره إلى ${objectLabelArabic}`,
            ];
          } else {
            implementationSteps = [
              `اجعل ${objectLabelArabic} في منتصف مساحة خالية وآمنة`,
              `يقف ${ageDescriptor} ثم يمشي ببطء نحوه (أربع إلى ست خطوات حسب العمر)`,
              `عند الوصول يرفع رجلاً واحدة ويحافظ على التوازن خمس ثوانٍ`,
              `يعود للخلف إلى نقطة البداية بخطوات متساوية`,
            ];
          }
          ageAdaptations = age < 4
            ? 'خطوتان فقط؛ رفع الرجل ثلاث ثوانٍ؛ يمكنك مسك يده إن احتاج'
            : age < 7
              ? 'ثلاث خطوات؛ رفع الرجل أربع ثوانٍ؛ راقب توازنه'
              : 'ست خطوات؛ رفع الرجل سبع ثوانٍ؛ يمكن إضافة خطوة جانبية';
          successIndicators = 'يمشي بخطوات مستقرة؛ يحافظ على التوازن عند رفع الرجل؛ يرجع للخلف دون أن يفقد توازنه؛ وضعه صحيح';
          safetyWarnings = 'المكان خالٍ من العوائق؛ الأرض غير زلقة؛ راقبه من قرب؛ لا أجسام حادة في المحيط';
        }
        break;
      }
      case 'bilateral_coordination': {
        if (useSafeAlternatives) {
          implementationSteps = [
            `بجانب ${objectLabelArabic} كما هي (بدون رفعها)؛ ضع وسادة صغيرة أو سجادة على سطح ${objectLabelArabic} أو على الأرض بجانبها`,
            `يده الأضعف تثبت الوسادة أو تلمس سطح ${objectLabelArabic}؛ يبقى التثبيت ثلاث ثوانٍ دون تحريك ${objectLabelArabic}`,
            `يده الأقوى تنفذ الحركة (نقر، أو دوران على الوسادة) خمس مرات`,
            `يعكس الأدوار: يثبت باليد الأقوى وينفذ بالأضعف خمس مرات`,
            `ينقل الوسادة الصغيرة بيديه معاً إلى مكان جديد على بُعد عشرين سنتمتراً (وليس ${objectLabelArabic})`
          ];
          ageAdaptations = age < 4
            ? 'حركة واحدة (نقر فقط)؛ ثلاث مرات؛ مسافة عشر سنتمترات'
            : age < 7
              ? 'حركتان مختلفتان؛ أربع مرات؛ خمس عشرة سنتمتراً'
              : 'حركات أكثر (دوران على الوسادة)؛ ست مرات؛ ثلاثون سنتمتراً';
          successIndicators = `يثبت الوسادة أو يلمس ${objectLabelArabic} بيد دون رفعها؛ ينفذ الحركة باليد الأخرى بدقة؛ يبدّل اليدين بنجاح؛ ينقل الوسادة بيديه معاً`;
          safetyWarnings = `لا يرفع ولا ينقل ${objectLabelArabic}؛ استخدم وسادة صغيرة أو لمس السطح فقط؛ ظهره مستقيم والسطح ثابت`;
        } else {
          const placeVerb = pickVariant(STEP_VERB.place, variantSeed + 6);
          implementationSteps = [
            `${placeVerb} ${envPhrase} على سطح ثابت أمام ${ageDescriptor}`,
            `يده الأضعف تثبت ${objectLabelArabic}؛ يبقى ممسكاً به ثلاث ثوانٍ`,
            `يده الأقوى تنفذ الحركة (نقر، أو دوران، أو دفع) على ${objectLabelArabic} خمس مرات`,
            `يعكس الأدوار: يثبت باليد الأقوى وينفذ بالأضعف خمس مرات`,
            `يرفع ${objectLabelArabic} بيديه معاً وينقله إلى مكان جديد على بُعد عشرين سنتمتراً`
          ];
          ageAdaptations = age < 4
            ? 'حركة واحدة (نقر فقط)؛ ثلاث مرات؛ مسافة عشر سنتمترات'
            : age < 7
              ? 'حركتان مختلفتان؛ أربع مرات؛ خمس عشرة سنتمتراً'
              : 'حركات أكثر (دوران ودفع)؛ ست مرات؛ ثلاثون سنتمتراً';
          successIndicators = `يثبت ${objectLabelArabic} بيد واحدة دون حركة؛ ينفذ الحركة باليد الأخرى بدقة؛ يبدّل اليدين بنجاح؛ ينقله بيديه معاً`;
          safetyWarnings = `تأكد أنّ ${objectLabelArabic} غير ثقيل؛ وأن يجلس وظهره مستقيم؛ والسطح ثابت`;
        }
        break;
      }
    }
  } else {
    const envOpener = pickVariant(INSTRUCTIONAL_PLACE.therapist, variantSeed);
    switch (activity.therapeuticFocus) {
      case 'sensory_regulation':
        implementationSteps = [
          `${envOpener} ${envPhrase} على سطح ثابت؛ تقليل المنافسات الحسية (ضجيج، حركة زائدة)؛ إضاءة مناسبة`,
          `استكشاف لمسي: يلمس الطفل ${objectLabelArabic} بيديه عشر ثوانٍ؛ معالجة المدخلات اللمسية (قوام، حرارة، وزن)`,
          `استكشاف بصري: يفحص ${objectLabelArabic} ويسمّي ثلاث خصائص بصرية على الأقل (لون، شكل، حجم، نمط)`,
          `دمج تنظيم ذاتي: تمرين تنفس منظم (أربع ثوانٍ شهيق أنفي، أربع حبس، أربع زفير فموي) مع التثبيت البصري على ${objectLabelArabic}`,
          `إعادة الدورة ثلاث مرات مع راحة خمس عشرة ثانية بين الدورات؛ مراقبة مستوى الإثارة وتعديل المدة حسب الاستجابة`
        ];
        ageAdaptations = age < 4
          ? 'تقصير مدة الاستكشاف إلى خمس ثوانٍ لكل نظام؛ توجيهات بصرية ولفظية بسيطة؛ نظامان حسيان فقط (لمس، بصر)'
          : age < 7
          ? 'ثماني ثوانٍ لكل نظام؛ دمج ثلاثة أنظمة (لمس، بصر، سمع إن أمكن)؛ عد تنازلي بصري عند الانتقال'
          : 'اثنتا عشرة إلى خمس عشرة ثانية لكل نظام؛ أربعة أنظمة؛ وصف تفصيلي للخصائص؛ راحة أطول حسب الحاجة';
        successIndicators = 'مشاركة فعّالة في الاستكشاف؛ تسمية ثلاث خصائص على الأقل بدقة؛ تنفس منظم واضح؛ مستوى إثارة مستقر (لا فرط ولا نقص)؛ انتباه مستمر';
        safetyWarnings = `ضمان أنّ ${objectLabelArabic} خالٍ من أجزاء قابلة للبلع أو حواف حادة؛ مراقبة الإثارة وإيقاف النشاط عند فرط الإثارة (هياج أو انسحاب)؛ تخفيف شدة المحفزات حسب التحمل`;
        break;
        
      case 'motor_planning':
        if (useSafeAlternatives) {
          implementationSteps = [
            `${envOpener} ${envPhrase} في مكانها (بدون تحريكها)؛ تحديد نقطة الوصول على بُعد مترين؛ إخلاء المسار من العوائق؛ علامات بصرية عند الحاجة`,
            `مرحلة تمثيل المسار: يفحص الطفل المسار بصرياً (من بجانب ${objectLabelArabic} إلى الوصول) عشر ثوانٍ؛ يصف المسار بصوت مسموع`,
            `صياغة الخطة الحركية: يحدد ثلاث خطوات: (١) أمشي حول ${objectLabelArabic}، (٢) المشي خطوتين نحو الهدف، (٣) التوقف عند نقطة الوصول؛ توثيق الخطة (بدون رفع أو سحب ${objectLabelArabic})`,
            `تنفيذ مراقَب: ينفذ الخطة كما حددها (تنقل بين دون تحريك الأثاث)؛ توقف بعد كل خطوة للتحقق؛ مراقبة جودة الحركة والوضعية`,
            `مرونة حركية: بعد نجاح التنفيذ يعدّل الخطة (مثلاً أربع خطوات بدل اثنتين) وينفذها؛ تكرار ثلاث مرات بتعديلات مختلفة`
          ];
          ageAdaptations = age < 4
            ? 'تقصير المسافة إلى متر واحد؛ خطوة حركية واحدة؛ توجيهات بصرية ولفظية واضحة؛ دعم يدوي عند الحاجة'
            : age < 7
              ? 'خطوتان حركيتان؛ تلميحات لفظية أثناء التنفيذ؛ عد تنازلي بصري عند الانتقال؛ مراقبة مباشرة'
              : 'مسار أعقد (حول عائق أو متعرج)؛ مسافة ثلاثة أمتار؛ تقليل التلميحات؛ زيادة عدد الخطوات الحركية';
          successIndicators = 'فحص المسار قبل التخطيط؛ خطة حركية واضحة متسلسلة؛ تنفيذ مطابق للخطة دون تحريك الأثاث الثقيل؛ توقف وتحقق بعد كل خطوة؛ تعديل ناجح عند الطلب؛ وضعية مناسبة طوال النشاط';
          safetyWarnings = `لا يرفع ولا يسحب ولا يدفع أي أثاث ثقيل؛ مساحة خالية من العوائق؛ سطح غير زلق؛ مراقبة وثيقة لمنع السقوط`;
        } else {
          implementationSteps = [
            `${envOpener} ${envPhrase} عند نقطة البداية؛ تحديد نقطة الوصول على بُعد مترين؛ إخلاء المسار من العوائق؛ علامات بصرية عند الحاجة`,
            `مرحلة تمثيل المسار: يفحص الطفل المسار بصرياً (من البداية إلى الوصول) عشر ثوانٍ؛ يصف المسار بصوت مسموع`,
            `صياغة الخطة الحركية: يحدد ثلاث خطوات: (١) رفع ${objectLabelArabic}، (٢) المشي خطوتين نحو الهدف، (٣) وضع ${objectLabelArabic} في نقطة الوصول؛ توثيق الخطة`,
            `تنفيذ مراقَب: ينفذ الخطة كما حددها؛ توقف بعد كل خطوة للتحقق؛ مراقبة جودة الحركة والوضعية`,
            `مرونة حركية: بعد نجاح التنفيذ يعدّل الخطة (مثلاً أربع خطوات بدل اثنتين) وينفذها؛ تكرار ثلاث مرات بتعديلات مختلفة`
          ];
          ageAdaptations = age < 4
            ? 'تقصير المسافة إلى متر واحد؛ خطوة حركية واحدة؛ توجيهات بصرية ولفظية واضحة؛ دعم يدوي عند الحاجة'
            : age < 7
              ? 'خطوتان حركيتان؛ تلميحات لفظية أثناء التنفيذ؛ عد تنازلي بصري عند الانتقال؛ مراقبة مباشرة'
              : 'مسار أعقد (حول عائق أو متعرج)؛ مسافة ثلاثة أمتار؛ تقليل التلميحات؛ زيادة عدد الخطوات الحركية';
          successIndicators = 'فحص المسار قبل التخطيط؛ خطة حركية واضحة متسلسلة؛ تنفيذ مطابق للخطة؛ توقف وتحقق بعد كل خطوة؛ تعديل ناجح عند الطلب؛ وضعية مناسبة طوال النشاط';
          safetyWarnings = `مساحة خالية من العوائق بقطر ثلاثة أمتار على الأقل؛ سطح غير زلق؛ مراقبة وثيقة لمنع السقوط؛ وأن يكون ${objectLabelArabic} متناسباً مع وزن الطفل`;
        }
        break;
        
      case 'executive_function':
        if (useSafeAlternatives) {
          implementationSteps = [
            `${envOpener} ${envPhrase} في مكانها (بدون تحريكها) مع وسائد أو أشياء صغيرة قابلة للنقل بترتيب عشوائي على سطح العمل أو الأرض؛ جميع العناصر مرئية وقابلة للوصول باللمس أو الإشارة`,
            `مرحلة التمثيل: يفحص الطفل ${objectLabelArabic} والأشياء الصغيرة بصرياً خمس عشرة ثانية دون لمس؛ يصف ما يراه`,
            `صياغة الخطة التنفيذية: يحدد ترتيب اللمس أو الوصول بصوت مسموع (أولاً ألمس ${objectLabelArabic}، ثانياً الوسادة...، إلخ)؛ توثيق الخطة (بدون نقل الأثاث الثقيل)`,
            `تنفيذ مراقَب: ينفذ الترتيب كما خطط (لمس أو وصول فوق/حول دون رفع أو سحب ${objectLabelArabic})؛ توقف بعد كل خطوة للتحقق؛ مراقبة كبح الاندفاع`,
            `استدعاء من الذاكرة العاملة: بعد الانتهاء يصف ما نفذه بالترتيب من الذاكرة دون النظر؛ مقارنة وصفه بالخطة المسجلة`
          ];
          ageAdaptations = age < 4
            ? 'عنصران فقط (لمس أو إشارة)؛ صور بصرية للترتيب؛ مدة فحص ثماني ثوانٍ؛ تلميحات لفظية أثناء التخطيط'
            : age < 7
              ? 'ثلاثة عناصر؛ تلميحات بصرية؛ مدة فحص اثنتي عشرة ثانية؛ إشارة إلى العناصر أثناء التخطيط'
              : 'أربعة أو خمسة عناصر؛ كتابة الخطة قبل التنفيذ؛ قواعد إضافية؛ لا نقل لأثاث ثقيل؛ مدة فحص عشرين ثانية';
          successIndicators = 'فحص العناصر قبل التخطيط؛ خطة واضحة متسلسلة؛ كبح الاندفاع؛ تنفيذ مطابق للترتيب دون تحريك الأثاث الثقيل؛ توقف وتحقق بعد كل خطوة؛ استدعاء دقيق من الذاكرة';
          safetyWarnings = 'لا يرفع ولا يسحب الأثاث الثقيل؛ استخدم فقط أشياء صغيرة قابلة للنقل أو اللمس؛ مراقبة لمنع إسقاط الأشياء الصغيرة؛ سطح ثابت وآمن';
        } else {
          implementationSteps = [
            `${envOpener} ${envPhrase} مع ثلاثة أو أربعة عناصر أخرى من البيئة بترتيب عشوائي على سطح عمل منظم؛ جميع العناصر مرئية وقابلة للوصول`,
            `مرحلة التمثيل: يفحص الطفل كل العناصر بصرياً خمس عشرة ثانية دون لمس؛ يصف ما يراه`,
            `صياغة الخطة التنفيذية: يحدد ترتيب وضع العناصر بصوت مسموع (أولاً ${objectLabelArabic}، ثانياً...، ثالثاً...، رابعاً...)؛ توثيق الخطة`,
            `تنفيذ مراقَب: ينفذ الترتيب كما خطط؛ توقف بعد كل عنصر للتحقق؛ مراقبة كبح الاندفاع (عدم البدء قبل إتمام التخطيط)`,
            `استدعاء من الذاكرة العاملة: بعد الانتهاء يصف ما نفذه بالترتيب من الذاكرة دون النظر؛ مقارنة وصفه بالخطة المسجلة`
          ];
          ageAdaptations = age < 4
            ? 'عنصران فقط؛ صور بصرية للترتيب؛ مدة فحص ثماني ثوانٍ؛ تلميحات لفظية أثناء التخطيط'
            : age < 7
              ? 'ثلاثة عناصر؛ تلميحات بصرية؛ مدة فحص اثنتي عشرة ثانية؛ إشارة إلى العناصر أثناء التخطيط'
              : 'أربعة أو خمسة عناصر؛ كتابة الخطة قبل التنفيذ؛ قواعد إضافية (ترتيب حسب الحجم أو اللون)؛ مدة فحص عشرين ثانية';
          successIndicators = 'فحص العناصر قبل التخطيط؛ خطة واضحة متسلسلة؛ كبح الاندفاع وعدم البدء قبل التخطيط؛ تنفيذ مطابق للترتيب؛ توقف وتحقق بعد كل خطوة؛ استدعاء دقيق من الذاكرة';
          safetyWarnings = 'جميع العناصر آمنة (بدون أجزاء قابلة للبلع)؛ مراقبة لمنع إسقاط العناصر؛ سطح ثابت وآمن';
        }
        break;
        
      case 'fine_motor':
        if (useSafeAlternatives) {
          implementationSteps = [
            `${envOpener} ${envPhrase} في مكانها (بدون رفعها)؛ وضع وسادة صغيرة أو سجادة على سطحها أو على الأرض بجانبها؛ جلوس صحيح (قدمان على الأرض، ظهر مستقيم)`,
            `تطوير القبضة: يلمس الطفل سطح ${objectLabelArabic} أو يمسك الوسادة بيده المهيمنة قبضة ثلاثية؛ يثبت خمس ثوانٍ دون رفع ${objectLabelArabic}؛ مراقبة جودة القبضة`,
            `تحكم حركي: يتتبع حواف ${objectLabelArabic} أو الوسادة بأصابعه ببطء وبتحكم؛ يثبت خمس ثوانٍ؛ مراقبة السلاسة والدقة (وصول فوق/حول دون قوة)`,
            `تحكم دوراني على الوسادة: إن كانت الوسادة قابلة للتحريك يديرها نصف دورة ببطء؛ أو يضع أصابعه داخل هدف مرسوم على بُعد ٣٠ سم`,
            `تنسيق بصري حركي: يضع الطفل الوسادة أو يضع أصابعه داخل الهدف بدقة؛ تكرار ثلاث مرات (بدون رفع أو نقل ${objectLabelArabic})`
          ];
          ageAdaptations = age < 4
            ? 'قبضة كاملة (كل الأصابع) على الوسادة؛ ثلاث ثوانٍ؛ هدف أكبر (قطر ١٠ سم)؛ مسافة ٢٠ سم؛ دعم يدوي عند الحاجة'
            : age < 7
              ? 'قبضة ثلاثية؛ أربع ثوانٍ؛ هدف متوسط (٧ سم)؛ مسافة ٢٥ سم؛ مراقبة وثيقة'
              : 'تتبع أدق؛ ست أو سبع ثوانٍ؛ هدف أصغر (٥ سم)؛ مسافة ٣٥–٤٠ سم؛ حركات أعقد إن أمكن';
          successIndicators = `لمس أو تثبيت دون رفع ${objectLabelArabic}؛ تتبع أو دوران سلس بلا إسقاط؛ وضع في الهدف بدقة (٣/٣)؛ وضعية مناسبة طوال النشاط`;
          safetyWarnings = `لا يرفع ولا ينقل ${objectLabelArabic}؛ استخدم وسادة صغيرة أو لمس السطح فقط؛ مراقبة الوضعية وتجنب الإجهاد`;
        } else {
          implementationSteps = [
            `${envOpener} ${envPhrase} على سطح ثابت بارتفاع مناسب (مستوى الكوع)؛ جلوس صحيح (قدمان على الأرض، ظهر مستقيم، كتفان مرتاحان)`,
            `تطوير القبضة: يمسك الطفل ${objectLabelArabic} بيده المهيمنة قبضة ثلاثية (إبهام، سبابة، وسطى)؛ يثبت القبضة خمس ثوانٍ؛ مراقبة جودة القبضة`,
            `تحكم حركي رأسي: يرفع ${objectLabelArabic} ببطء من السطح إلى مستوى الكتف مع الحفاظ على القبضة والوضعية؛ يثبت خمس ثوانٍ ثم يخفضه ببطء`,
            `تحكم حركي دوراني: يدير ${objectLabelArabic} نصف دورة ببطء وبتحكم، بحركات أصابع منفصلة؛ يعيده إلى الوضع الأصلي؛ مراقبة السلاسة والدقة`,
            `تنسيق بصري حركي: وضع هدف (دائرة قطرها ٥–٧ سم) على بُعد ٣٠ سم؛ يضع الطفل ${objectLabelArabic} داخل الهدف بدقة بحركة متحكم بها؛ تكرار ثلاث مرات`
          ];
          ageAdaptations = age < 4
            ? 'قبضة كاملة (كل الأصابع)؛ ثلاث ثوانٍ؛ هدف أكبر (قطر ١٠ سم)؛ مسافة ٢٠ سم؛ دعم يدوي عند الحاجة'
            : age < 7
              ? 'قبضة ثلاثية؛ أربع ثوانٍ؛ هدف متوسط (٧ سم)؛ مسافة ٢٥ سم؛ مراقبة وثيقة'
              : 'قبضة دقيقة (إبهام–سبابة)؛ ست أو سبع ثوانٍ؛ هدف أصغر (٥ سم)؛ مسافة ٣٥–٤٠ سم؛ حركات أعقد إن أمكن';
          successIndicators = `قبضة وظيفية مناسبة؛ رفع ${objectLabelArabic} ثابتاً خمس ثوانٍ بلا اهتزاز؛ دوران سلس دقيق بلا إسقاط؛ وضع في الهدف بدقة (٣/٣)؛ وضعية مناسبة طوال النشاط`;
          safetyWarnings = `أن لا يتجاوز وزن ${objectLabelArabic} نحو ١٠٪ من وزن الطفل؛ خالٍ من الحواف الحادة؛ مراقبة الوضعية وتجنب الإجهاد؛ إيقاف عند ظهور علامات التعب العضلي`;
        }
        break;
        
      case 'gross_motor':
        if (useSafeAlternatives) {
          implementationSteps = [
            `${envOpener} ${envPhrase} في مكانها (بدون تحريكها)؛ مساحة خالية على الأرض للتنقل (قطر ثلاثة أمتار على الأقل)؛ إخلاء العوائق؛ سطح غير زلق`,
            `الوضع الابتدائي: وقوف الطفل على بُعد خطوتين من ${objectLabelArabic}؛ قدماه بعرض الكتفين؛ ذراعاه إلى الجانب؛ ظهر مستقيم؛ نظر إلى ${objectLabelArabic}`,
            `مشي أمامي متحكم: يمشي ببطء نحو ${objectLabelArabic} (أربع خطوات) — تنقل حول/بين دون صعود أو دفع؛ توازن وظهر مستقيم وخطوات متساوية؛ مراقبة جودة الحركة والوضعية`,
            `توازن ديناميكي مع دعم تحميل وزن: عند الوصول يضع يداً واحدة على ${objectLabelArabic} لدعم خفيف ويرفع رجلاً واحدة ويحافظ على التوازن خمس ثوانٍ؛ مراقبة الاستقرار والوضعية (بدون صعود على الأثاث)`,
            `مشي خلفي: يمشي للخلف ببطء (أربع خطوات) إلى نقطة البداية؛ التثبيت البصري على ${objectLabelArabic}؛ ظهر مستقيم؛ مراقبة التوازن والوعي المكاني`
          ];
          ageAdaptations = age < 4
            ? 'خطوتان فقط؛ رفع الرجل ثلاث ثوانٍ؛ دعم يدوي عند الحاجة؛ توجيهات بصرية واضحة'
            : age < 7
              ? 'ثلاث خطوات؛ رفع الرجل أربع ثوانٍ؛ مراقبة وثيقة؛ دعم يدوي خفيف إن لزم'
              : 'ست خطوات؛ رفع الرجل سبع ثوانٍ؛ إضافة حركة جانبية إن أمكن؛ تقليل الدعم';
          successIndicators = `مشي بخطوات مستقيمة متوازنة دون صعود على الأثاث؛ وضعية مناسبة؛ توازن عند رفع الرجل خمس ثوانٍ بلا اهتزاز كبير؛ مشي خلفي دون فقدان التوازن؛ وعي مكاني بموقعه بالنسبة إلى ${objectLabelArabic}`;
          safetyWarnings = `لا يصعد على الأثاث ولا يدفعها؛ مساحة خالية من العوائق؛ سطح غير زلق ومستقر؛ مراقبة وثيقة لمنع السقوط؛ إزالة أجسام حادة أو خطرة`;
        } else {
          implementationSteps = [
            `${envOpener} ${envPhrase} في منتصف مساحة خالية (قطر ثلاثة أمتار على الأقل)؛ إخلاء العوائق؛ سطح غير زلق؛ علامات بصرية للبداية والوصول`,
            `الوضع الابتدائي: وقوف الطفل على بُعد خطوتين من ${objectLabelArabic}؛ قدماه بعرض الكتفين؛ ذراعاه إلى الجانب؛ ظهر مستقيم؛ نظر إلى ${objectLabelArabic}`,
            `مشي أمامي متحكم: يمشي ببطء نحو ${objectLabelArabic} (أربع خطوات)؛ توازن وظهر مستقيم وخطوات متساوية؛ مراقبة جودة الحركة والوضعية`,
            `توازن ديناميكي: عند الوصول يرفع رجلاً واحدة (غير المهيمنة) ويحافظ على التوازن خمس ثوانٍ بجانب ${objectLabelArabic}؛ مراقبة الاستقرار والوضعية`,
            `مشي خلفي: يمشي للخلف ببطء (أربع خطوات) إلى نقطة البداية؛ التثبيت البصري على ${objectLabelArabic}؛ ظهر مستقيم؛ مراقبة التوازن والوعي المكاني`
          ];
          ageAdaptations = age < 4
            ? 'خطوتان فقط؛ رفع الرجل ثلاث ثوانٍ؛ دعم يدوي عند الحاجة؛ توجيهات بصرية واضحة'
            : age < 7
              ? 'ثلاث خطوات؛ رفع الرجل أربع ثوانٍ؛ مراقبة وثيقة؛ دعم يدوي خفيف إن لزم'
              : 'ست خطوات؛ رفع الرجل سبع ثوانٍ؛ إضافة حركة جانبية إن أمكن؛ تقليل الدعم';
          successIndicators = `مشي بخطوات مستقيمة متوازنة متساوية؛ وضعية مناسبة (ظهر مستقيم، كتفان مرتاحان)؛ توازن عند رفع الرجل خمس ثوانٍ بلا اهتزاز كبير؛ مشي خلفي دون فقدان التوازن؛ وعي مكاني بموقعه بالنسبة إلى ${objectLabelArabic}`;
          safetyWarnings = `مساحة خالية من العوائق بقطر ثلاثة أمتار على الأقل؛ سطح غير زلق ومستقر؛ مراقبة وثيقة لمنع السقوط؛ إزالة أجسام حادة أو خطرة؛ ثبات ${objectLabelArabic} وعدم احتمال سقوطه`;
        }
        break;
        
      case 'bilateral_coordination':
        if (useSafeAlternatives) {
          implementationSteps = [
            `${envOpener} ${envPhrase} في مكانها (بدون رفعها)؛ وضع وسادة صغيرة أو سجادة على سطح ${objectLabelArabic} أو على الأرض بجانبها؛ جلوس صحيح (قدمان على الأرض، ظهر مستقيم)`,
            `تطوير التثبيت: يضع الطفل يده غير المهيمنة على الوسادة أو يلمس سطح ${objectLabelArabic} ويثبت خمس ثوانٍ دون رفع ${objectLabelArabic}؛ مراقبة الاستقرار`,
            `تنفيذ باليد المهيمنة: ينفذ حركة محددة (نقر خمس مرات، أو دوران على الوسادة) مع الحفاظ على التثبيت باليد الأخرى؛ مراقبة التنسيق`,
            `تبديل الأدوار: يثبت باليد المهيمنة وينفذ نفس الحركة بيده غير المهيمنة خمس مرات؛ مراقبة جودة الحركة والتنسيق`,
            `تنسيق ثنائي مركّب: ينقل الوسادة الصغيرة بيديه معاً إلى موقع جديد على بُعد ثلاثين سنتمتراً (وليس ${objectLabelArabic})؛ تكرار ثلاث مرات`
          ];
          ageAdaptations = age < 4
            ? 'حركة واحدة بسيطة (نقر فقط)؛ ثلاث مرات؛ تثبيت ثلاث ثوانٍ؛ مسافة خمس عشرة سنتمتراً؛ دعم يدوي عند الحاجة'
            : age < 7
              ? 'حركتان مختلفتان؛ أربع تكرارات؛ تثبيت أربع ثوانٍ؛ مسافة عشرين سنتمتراً؛ مراقبة وثيقة'
              : 'حركات أعقد (دوران ونقر على الوسادة)؛ ست تكرارات؛ تثبيت ست ثوانٍ؛ مسافة أربعين سنتمتراً؛ حركات متزامنة إن أمكن';
          successIndicators = `تثبيت أو لمس ${objectLabelArabic} بيد واحدة ثابتاً خمس ثوانٍ بلا اهتزاز؛ تنفيذ دقيق باليد الأخرى؛ تبديل أدوار ناجح؛ نقل الوسادة بيديه معاً بشكل متسق ومتحكم (وليس ${objectLabelArabic})؛ وضعية مناسبة طوال النشاط`;
          safetyWarnings = `لا يرفع ولا ينقل ${objectLabelArabic}؛ استخدم وسادة صغيرة أو لمس السطح فقط؛ مراقبة الوضعية وتجنب الإجهاد؛ إيقاف عند ظهور علامات التعب`;
        } else {
          implementationSteps = [
            `${envOpener} ${envPhrase} على سطح ثابت بارتفاع مناسب أمام الطفل؛ جلوس صحيح (قدمان على الأرض، ظهر مستقيم)`,
            `تطوير التثبيت: يضع الطفل يده غير المهيمنة على ${objectLabelArabic} ويثبته بقبضة وظيفية؛ يبقى التثبيت خمس ثوانٍ مع الحفاظ على الوضعية؛ مراقبة الاستقرار`,
            `تنفيذ باليد المهيمنة: ينفذ حركة محددة على ${objectLabelArabic} (نقر خمس مرات، أو دوران ثلاث مرات، أو دفع ثلاث مرات) مع الحفاظ على التثبيت باليد الأخرى؛ مراقبة التنسيق`,
            `تبديل الأدوار: يثبت ${objectLabelArabic} بيده المهيمنة وينفذ نفس الحركة بيده غير المهيمنة خمس مرات؛ مراقبة جودة الحركة والتنسيق`,
            `تنسيق ثنائي مركّب: يرفع ${objectLabelArabic} بيديه معاً وينقله إلى موقع جديد على بُعد ثلاثين سنتمتراً مع الحفاظ على التنسيق والوضعية؛ تكرار ثلاث مرات`
          ];
          ageAdaptations = age < 4
            ? 'حركة واحدة بسيطة (نقر فقط)؛ ثلاث مرات؛ تثبيت ثلاث ثوانٍ؛ مسافة خمس عشرة سنتمتراً؛ دعم يدوي عند الحاجة'
            : age < 7
              ? 'حركتان مختلفتان؛ أربع تكرارات؛ تثبيت أربع ثوانٍ؛ مسافة عشرين سنتمتراً؛ مراقبة وثيقة'
              : 'حركات أعقد (دوران ودفع ونقر)؛ ست تكرارات؛ تثبيت ست ثوانٍ؛ مسافة أربعين سنتمتراً؛ حركات متزامنة إن أمكن';
          successIndicators = `تثبيت ${objectLabelArabic} بيد واحدة ثابتاً خمس ثوانٍ بلا اهتزاز؛ تنفيذ دقيق باليد الأخرى مع الحفاظ على التثبيت؛ تبديل أدوار ناجح مع الحفاظ على الجودة؛ نقل ${objectLabelArabic} بيديه معاً بشكل متسق ومتحكم؛ وضعية مناسبة طوال النشاط`;
          safetyWarnings = `أن لا يتجاوز وزن ${objectLabelArabic} نحو ١٥٪ من وزن الطفل؛ مراقبة الوضعية وتجنب الإجهاد؛ سطح ثابت وآمن؛ إيقاف عند ظهور علامات التعب`;
        }
        break;
    }
  }

  if (activity.element?.risks?.length) {
    safetyWarnings = [safetyWarnings, activity.element.risks.join('؛ ')].filter(Boolean).join('؛ ');
  }

  const ageAlignmentSuffix = 'النشاط معدّل للفئة العمرية المُدخلة.';
  const finalAgeAdaptations = ageAdaptations ? `${ageAdaptations} ${ageAlignmentSuffix}` : ageAlignmentSuffix;

  return {
    activityName,
    therapeuticGoal,
    targetSkill,
    toolsUsed,
    implementationSteps,
    suggestedDuration,
    ageAdaptations: finalAgeAdaptations,
    successIndicators,
    safetyWarnings,
    clinicalRationale: reasoning.clinicalRationale,
    suggestedProgression: reasoning.suggestedProgression,
    environmentalModificationTips: reasoning.environmentalModificationTips,
    functionalOutcome: reasoning.functionalOutcome,
    environmentalAdaptation: reasoning.environmentalAdaptation,
  };
}

export function formatActivitiesInArabic(
  activities: Activity[],
  labels: string[],
  age: number,
  userMode: UserMode,
  /** Map from raw English label to finalized Arabic element name; when provided, activity titles use this instead of translating from English. */
  labelToArabicMap?: Map<string, string>
): {
  labelsArabic: string[];
  activitiesArabic: ArabicFormattedActivity[];
} {
  const labelsArabic = labels.map(translateObjectLabel);

  const activitiesArabic: ArabicFormattedActivity[] = activities.map((activity, index) => {
    const objectLabelArabicResolved =
      labelToArabicMap?.get(activity.objectLabel) ?? translateObjectLabel(activity.objectLabel);
    const therapeuticFocusArabic = therapeuticFocusTranslations[activity.therapeuticFocus][userMode];
    const variantSeed = index + (activity.humanizeOffset ?? 0);
    const formattedArabic = formatActivityInArabic(
      activity,
      age,
      userMode,
      variantSeed,
      objectLabelArabicResolved
    );

    return {
      objectLabel: activity.objectLabel,
      objectLabelArabic: objectLabelArabicResolved,
      therapeuticFocus: activity.therapeuticFocus,
      therapeuticFocusArabic,
      formattedArabic,
    };
  });

  return {
    labelsArabic,
    activitiesArabic,
  };
}
