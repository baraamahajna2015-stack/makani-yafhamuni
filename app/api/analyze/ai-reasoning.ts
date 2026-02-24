/**
 * AI reasoning layer on top of MobileNet.
 * Interprets raw detection labels in real-world environmental terms,
 * outputs context-aware Arabic results with functional categories (confidence used internally only, never displayed).
 */

export interface RawPrediction {
  className: string;
  probability: number;
}

export interface ReasonedElement {
  /** Raw MobileNet label (for mapping to pipeline) */
  rawLabel: string;
  /** اسم العنصر — realistic, understandable formulation in Arabic */
  elementNameAr: string;
  /** الفئة الوظيفية */
  functionalCategory: string;
  /** تفسير سياقي قصير — reflects environment understanding */
  contextualInterpretation: string;
  /** درجة الثقة بعد المعالجة (0–1) — للاستخدام الداخلي فقط، لا تُعرض في الواجهة */
  confidenceAfterProcessing: number;
}

/** Functional categories in professional Arabic (فئة وظيفية) */
const FUNCTIONAL_CATEGORIES: Record<string, string> = {
  seating: 'أثاث جلوس',
  workSurface: 'سطح عمل',
  floorFurnishing: 'أرضية وفرش',
  lighting: 'إضاءة',
  opening: 'فتحات ومرور',
  playMotion: 'لعب وحركة',
  dailyUse: 'أدوات استعمال يومي',
  storage: 'تخزين وترتيب',
  rest: 'عناصر راحة ونوم',
  hygiene: 'عناصر النظافة',
  electronics: 'أجهزة وإلكترونيات',
  decor: 'عناصر زينة وديكور',
  structure: 'عناصر إنشائية ثابتة',
};

/** Normalize label for lookup (lowercase, first segment) */
function norm(label: string): string {
  return label.split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Relevance weight: higher = more likely to be meaningful in home/therapy environment */
function relevanceWeight(normalized: string): number {
  const lowRelevance = ['spot', 'gondola', 'restaurant', 'barber', 'grocery', 'bakery', 'library', 'prison', 'jail'];
  if (lowRelevance.some((w) => normalized.includes(w))) return 0.4;
  const highRelevance = ['couch', 'sofa', 'chair', 'table', 'desk', 'bed', 'pillow', 'blanket', 'carpet', 'rug', 'ball', 'stairs', 'door', 'window', 'lamp', 'book', 'toy', 'shelf', 'stool', 'bench'];
  if (highRelevance.some((w) => normalized.includes(w))) return 1;
  return 0.75;
}

/** Priority for ordering: 2 = tangible/interaction-based, 0 = structural/background. Used to surface 3–5 meaningful objects. */
const INTERACTION_FIRST = ['ball', 'toy', 'doll', 'teddy', 'block', 'cube', 'puzzle', 'lego', 'book', 'pillow', 'blanket', 'quilt', 'cushion', 'basket', 'box', 'bowl', 'plate', 'cup', 'towel', 'carpet', 'rug', 'chair', 'stool', 'bench', 'ottoman', 'table', 'desk', 'couch', 'sofa', 'bed', 'shelf', 'drawer', 'bookcase', 'wardrobe', 'cabinet', 'bike', 'bicycle', 'swing', 'lamp', 'mirror', 'plant', 'vase'];
const STRUCTURAL_BACKGROUND = ['wall', 'floor', 'door', 'window', 'stairs', 'step'];

function interactionPriorityScore(normalized: string): number {
  if (INTERACTION_FIRST.some((w) => normalized.includes(w))) return 2;
  if (STRUCTURAL_BACKGROUND.some((w) => normalized.includes(w))) return 0;
  return 1;
}

/** Interpret single label: Arabic name, category, context, confidence. No placeholders. */
function interpretOne(
  className: string,
  probability: number
): ReasonedElement | null {
  const n = norm(className);
  const base = n.replace(/\s+/g, '');

  // Exclude generic or irrelevant labels (no meaningful object)
  const genericOrIrrelevant = ['object', 'entity', 'thing', 'item', 'something'];
  const firstWord = n.split(/\s+/)[0] ?? n;
  if (genericOrIrrelevant.some((w) => firstWord === w || firstWord === `${w}s`)) return null;

  // Exclude irrelevant or culturally inappropriate for therapeutic/home environment
  const exclude = ['swastika', 'confederate', 'cartoon', 'comic', 'mask', 'weapon', 'gun', 'rifle', 'grenade'];
  if (exclude.some((w) => n.includes(w))) return null;

  const rel = relevanceWeight(n);
  const confidence = Math.min(1, Math.round((probability * 0.6 + rel * 0.4) * 100) / 100);

  // Map to real-world environmental element with professional Arabic
  const interpretations: Array<{
    key: string;
    nameAr: string;
    category: string;
    context: string;
  }> = [
    { key: 'couch', nameAr: 'كنبة منزلية', category: FUNCTIONAL_CATEGORIES.seating, context: 'عنصر جلوس مستقر يوفر دعمًا وضعيًا وفرصة للتنظيم الحسي والراحة.' },
    { key: 'sofa', nameAr: 'أريكة', category: FUNCTIONAL_CATEGORIES.seating, context: 'أثاث جلوس رئيسي في الغرفة يدعم وضعية الجلوس والانتقالات واللعب الوظيفي.' },
    { key: 'chair', nameAr: 'كرسي', category: FUNCTIONAL_CATEGORIES.seating, context: 'دعم جلوس بارتفاع مناسب يسهّل المشاركة في أنشطة الطاولة والتوازن الجلوسي.' },
    { key: 'table', nameAr: 'طاولة', category: FUNCTIONAL_CATEGORIES.workSurface, context: 'سطح عمل ثابت يدعم الأنشطة الدقيقة والتنظيم البصري والوصول الآمن.' },
    { key: 'desk', nameAr: 'مكتب', category: FUNCTIONAL_CATEGORIES.workSurface, context: 'مساحة عمل منظمة مناسبة للتركيز والحركة الدقيقة والوظائف التنفيذية.' },
    { key: 'bed', nameAr: 'سرير', category: FUNCTIONAL_CATEGORIES.rest, context: 'عنصر راحة ونوم يمكن استغلاله بأمان لأنشطة تنظيم حسي وانتقالات مدروسة.' },
    { key: 'pillow', nameAr: 'وسادة', category: FUNCTIONAL_CATEGORIES.rest, context: 'عنصر لمسي ناعم يدعم التهدئة والوعي الحسي والتحكم في القوة.' },
    { key: 'blanket', nameAr: 'بطانية', category: FUNCTIONAL_CATEGORIES.rest, context: 'غطاء ناعم يوفر مدخلات لمسية قابلة للضبط والتنظيم الذاتي.' },
    { key: 'quilt', nameAr: 'لحاف', category: FUNCTIONAL_CATEGORIES.rest, context: 'فراش ناعم يعزز الإحساس بالأمان والاستكشاف اللمسي.' },
    { key: 'carpet', nameAr: 'سجادة أرضية', category: FUNCTIONAL_CATEGORIES.floorFurnishing, context: 'سطح آمن على الأرض يدعم الحركة الكبيرة والتوازن واللعب الأرضي.' },
    { key: 'rug', nameAr: 'سجادة', category: FUNCTIONAL_CATEGORIES.floorFurnishing, context: 'منطقة محددة على الأرض توفر ثباتًا ومرجعًا مكانيًا للأنشطة الحركية.' },
    { key: 'floor', nameAr: 'أرضية الغرفة', category: FUNCTIONAL_CATEGORIES.structure, context: 'المساحة الأرضية المتاحة للمشي والتوازن والانتقالات.' },
    { key: 'ball', nameAr: 'كرة', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'أداة حركية قابلة للتدحرج تدعم التخطيط الحركي والتنسيق الثنائي.' },
    { key: 'stairs', nameAr: 'درج', category: FUNCTIONAL_CATEGORIES.structure, context: 'عنصر صعود ونزول يتطلب تخطيطًا حركيًا وتوازنًا؛ يُستخدم بحذر وإشراف.' },
    { key: 'step', nameAr: 'درجة أو منصة', category: FUNCTIONAL_CATEGORIES.structure, context: 'ارتفاع بسيط يمكن استخدامه للتوازن والانتقال مع مراعاة السلامة.' },
    { key: 'stool', nameAr: 'كرسي صغير أو مقعد', category: FUNCTIONAL_CATEGORIES.seating, context: 'جلوس منخفض أو وسيط يدعم الوصول إلى الأسطح والاستقرار.' },
    { key: 'bench', nameAr: 'مقعد', category: FUNCTIONAL_CATEGORIES.seating, context: 'عنصر جلوس مستقر للمساحة المتاحة والانتظار أو اللعب الهادئ.' },
    { key: 'ottoman', nameAr: 'مقعد قدمين', category: FUNCTIONAL_CATEGORIES.seating, context: 'عنصر منخفض للراحة أو كهدف حركي آمن.' },
    { key: 'lamp', nameAr: 'مصباح', category: FUNCTIONAL_CATEGORIES.lighting, context: 'مصدر إضاءة يمكن ضبطه لتهيئة البيئة البصرية.' },
    { key: 'door', nameAr: 'باب', category: FUNCTIONAL_CATEGORIES.opening, context: 'حدّ مكاني ومسار انتقال؛ يُراعى في تخطيط المسار والسلامة.' },
    { key: 'window', nameAr: 'نافذة', category: FUNCTIONAL_CATEGORIES.opening, context: 'فتحة إضاءة وتهوية؛ القرب منها يتطلب إشرافًا من حيث السلامة.' },
    { key: 'wall', nameAr: 'جدار', category: FUNCTIONAL_CATEGORIES.structure, context: 'حدّ ثابت للغرفة يعطي مرجعًا مكانيًا وثباتًا.' },
    { key: 'book', nameAr: 'كتاب', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'مادة للقراءة والتنظيم البصري والأنشطة الدقيقة والتنفيذية.' },
    { key: 'bookcase', nameAr: 'خزانة كتب', category: FUNCTIONAL_CATEGORIES.storage, context: 'تخزين منظم يدعم الترتيب والوصول والتنظيم البصري.' },
    { key: 'shelf', nameAr: 'رف', category: FUNCTIONAL_CATEGORIES.storage, context: 'سطح تخزين يسهّل الترتيب والوصول والتنظيم.' },
    { key: 'wardrobe', nameAr: 'خزانة ملابس', category: FUNCTIONAL_CATEGORIES.storage, context: 'تخزين مغلق يوفر مرجعًا مكانيًا وفرص ترتيب.' },
    { key: 'cabinet', nameAr: 'خزانة', category: FUNCTIONAL_CATEGORIES.storage, context: 'وحدة تخزين ثابتة تدعم التنظيم والوصول الآمن.' },
    { key: 'drawer', nameAr: 'درج تخزين', category: FUNCTIONAL_CATEGORIES.storage, context: 'مساحة مغلقة للترتيب والوصول المتسلسل.' },
    { key: 'box', nameAr: 'صندوق', category: FUNCTIONAL_CATEGORIES.storage, context: 'حاوية للترتيب والنقل والأنشطة التنفيذية.' },
    { key: 'basket', nameAr: 'سلة', category: FUNCTIONAL_CATEGORIES.storage, context: 'وعاء مفتوح للنقل والترتيب والتنسيق الثنائي.' },
    { key: 'bike', nameAr: 'دراجة', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'أداة حركية تُستخدم بحذر في المساحة المتاحة مع مراعاة السلامة.' },
    { key: 'bicycle', nameAr: 'دراجة', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'عنصر حركي يحتاج مساحة ومراقبة عند الاستخدام.' },
    { key: 'toy', nameAr: 'لعبة', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'أداة لعب مناسبة للأنشطة الدقيقة أو الحركية حسب نوعها.' },
    { key: 'doll', nameAr: 'دمية', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'عنصر لعب يدعم التخيل والحركة الدقيقة واللعب الوظيفي.' },
    { key: 'teddy', nameAr: 'دمية دب', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'لعبة ناعمة مناسبة للتهدئة واللمس الآمن.' },
    { key: 'block', nameAr: 'مكعب أو قطعة بناء', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'عنصر بناء يدعم التنسيق والتنظيم والوظائف التنفيذية.' },
    { key: 'cube', nameAr: 'مكعب', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'شكل ثابت يمكن استخدامه للترتيب والحركة الدقيقة.' },
    { key: 'puzzle', nameAr: 'لغز أو بانوراما', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'نشاط تنفيذي وتخطيط بصري وتنسيق ثنائي.' },
    { key: 'lego', nameAr: 'قطع بناء', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'عناصر تركيب تدعم الحركة الدقيقة والتخطيط.' },
    { key: 'tv', nameAr: 'تلفزيون', category: FUNCTIONAL_CATEGORIES.electronics, context: 'شاشة ثابتة؛ يمكن ضبط البعد والوقت لتنظيم البصري.' },
    { key: 'television', nameAr: 'تلفزيون', category: FUNCTIONAL_CATEGORIES.electronics, context: 'جهاز عرض ثابت في الغرفة يُراعى في تهيئة البيئة.' },
    { key: 'monitor', nameAr: 'شاشة', category: FUNCTIONAL_CATEGORIES.electronics, context: 'سطح عرض ثابت يدعم الأنشطة الموجهة عند الحاجة.' },
    { key: 'laptop', nameAr: 'حاسوب محمول', category: FUNCTIONAL_CATEGORIES.electronics, context: 'جهاز عمل أو تعلم يمكن إبعاده عند التركيز على أنشطة حركية.' },
    { key: 'computer', nameAr: 'حاسوب', category: FUNCTIONAL_CATEGORIES.electronics, context: 'جهاز ثابت في الغرفة؛ يُنظّم استخدامه حسب أهداف الجلسة.' },
    { key: 'phone', nameAr: 'هاتف', category: FUNCTIONAL_CATEGORIES.electronics, context: 'جهاز اتصال؛ يمكن استبعاده لتقليل التشويش أثناء الأنشطة.' },
    { key: 'remote', nameAr: 'جهاز تحكم', category: FUNCTIONAL_CATEGORIES.electronics, context: 'أداة صغيرة تدعم القبضة والضغط المتدرج.' },
    { key: 'keyboard', nameAr: 'لوحة مفاتيح', category: FUNCTIONAL_CATEGORIES.electronics, context: 'سطح مفاتيح للضغط المنظم والحركة الدقيقة عند الحاجة.' },
    { key: 'cushion', nameAr: 'وسادة صغيرة', category: FUNCTIONAL_CATEGORIES.rest, context: 'عنصر ناعم للدعم أو اللعب اللمسي الآمن.' },
    { key: 'mattress', nameAr: 'فراش', category: FUNCTIONAL_CATEGORIES.rest, context: 'سطح راحة يدعم الحركة الآمنة والتنظيم الحسي.' },
    { key: 'plant', nameAr: 'نبات', category: FUNCTIONAL_CATEGORIES.decor, context: 'عنصر بصري طبيعي يخفف من جفاف البيئة.' },
    { key: 'vase', nameAr: 'مزهرية', category: FUNCTIONAL_CATEGORIES.decor, context: 'عنصر زينة ثابت؛ يُراعى عدم كسره في الأنشطة الحركية.' },
    { key: 'mirror', nameAr: 'مرآة', category: FUNCTIONAL_CATEGORIES.decor, context: 'انعكاس بصري يساعد في الوعي الجسدي عند استخدام آمن.' },
    { key: 'towel', nameAr: 'منشفة', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'قوام لمسي يمكن استخدامه للتهدئة أو التنظيف الوظيفي.' },
    { key: 'bowl', nameAr: 'وعاء', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'حاوية مناسبة للترتيب والنقل والحركة الدقيقة.' },
    { key: 'plate', nameAr: 'صحن', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'سطح حمل ثابت للأنشطة المنزلية أو اللعب التمثيلي.' },
    { key: 'cup', nameAr: 'كوب', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'أداة حمل تدعم القبضة والتناسق.' },
    { key: 'diningtable', nameAr: 'طاولة طعام', category: FUNCTIONAL_CATEGORIES.workSurface, context: 'سطح مشترك للوجبات والأنشطة العائلية والتنظيم.' },
    { key: 'coffeetable', nameAr: 'طاولة قهوة', category: FUNCTIONAL_CATEGORIES.workSurface, context: 'طاولة منخفضة مناسبة للوصول واللعب على الأرض.' },
    { key: 'highchair', nameAr: 'كرسي أطفال', category: FUNCTIONAL_CATEGORIES.seating, context: 'جلوس آمن بارتفاع الطاولة مع دعم وضعية.' },
    { key: 'bathtub', nameAr: 'حوض استحمام', category: FUNCTIONAL_CATEGORIES.hygiene, context: 'مساحة مائية؛ تُستخدم تحت إشراف لتهدئة حسية عند الحاجة.' },
    { key: 'tub', nameAr: 'حوض', category: FUNCTIONAL_CATEGORIES.hygiene, context: 'وعاء كبير؛ الاستخدام يكون بإشراف وفق السياق.' },
    { key: 'sink', nameAr: 'حوض غسيل', category: FUNCTIONAL_CATEGORIES.hygiene, context: 'سطح غسل ثابت؛ يدعم الأنشطة اليومية والتسلسل.' },
    { key: 'toilet', nameAr: 'مرحاض', category: FUNCTIONAL_CATEGORIES.hygiene, context: 'عنصر حمام ثابت؛ يُراعى في التوجيه اليومي دون تفصيل علاجي.' },
    { key: 'refrigerator', nameAr: 'ثلاجة', category: FUNCTIONAL_CATEGORIES.electronics, context: 'جهاز ثابت في المطبخ؛ مرجع مكاني دون استخدام في الأنشطة العلاجية.' },
    { key: 'oven', nameAr: 'فرن', category: FUNCTIONAL_CATEGORIES.electronics, context: 'جهاز حراري ثابت؛ يُذكر من حيث السلامة فقط.' },
    { key: 'microwave', nameAr: 'ميكروويف', category: FUNCTIONAL_CATEGORIES.electronics, context: 'جهاز مطبخ ثابت؛ لا يُستخدم في أنشطة الطفل المباشرة.' },
    { key: 'swing', nameAr: 'أرجوحة', category: FUNCTIONAL_CATEGORIES.playMotion, context: 'عنصر حركي دهليزي؛ يُستخدم تحت إشراف ووفق التحمل.' },
    { key: 'board', nameAr: 'لوحة', category: FUNCTIONAL_CATEGORIES.workSurface, context: 'سطح ثابت للكتابة أو التنظيم البصري.' },
    { key: 'card', nameAr: 'بطاقات', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'مواد للترتيب واللعب التنفيذي والذاكرة العاملة.' },
    { key: 'notebook', nameAr: 'دفتر', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'سطح للكتابة والتنظيم والتسلسل.' },
    { key: 'backpack', nameAr: 'حقيبة ظهر', category: FUNCTIONAL_CATEGORIES.storage, context: 'حاوية نقل تدعم الترتيب والتحميل الثنائي.' },
    { key: 'scissors', nameAr: 'مقص', category: FUNCTIONAL_CATEGORIES.dailyUse, context: 'أداة دقيقة؛ تُستخدم تحت إشراف في أنشطة القص.' },
  ];

  for (const interp of interpretations) {
    const key = interp.key.replace(/\s+/g, '');
    if (base.includes(key) || key.includes(base)) {
      return {
        rawLabel: className,
        elementNameAr: interp.nameAr,
        functionalCategory: interp.category,
        contextualInterpretation: interp.context,
        confidenceAfterProcessing: confidence,
      };
    }
  }

  // Environment-like terms: derive a specific Arabic name and functionally meaningful context (avoid generic "عنصر من البيئة").
  const envLike = ['furniture', 'furnishing', 'room', 'indoor', 'floor', 'wall', 'table', 'chair', 'seat', 'cushion', 'mat', 'rug', 'carpet', 'shelf', 'desk', 'bed', 'lamp', 'door', 'window'];
  if (envLike.some((w) => n.includes(w))) {
    const safeName =
      n.includes('table') ? 'طاولة'
        : n.includes('chair') || n.includes('seat') ? 'كرسي'
        : n.includes('floor') || n.includes('mat') ? 'أرضية أو فرش'
        : n.includes('shelf') ? 'رف'
        : n.includes('desk') ? 'مكتب'
        : n.includes('bed') ? 'سرير'
        : n.includes('lamp') ? 'مصباح'
        : n.includes('door') ? 'باب'
        : n.includes('window') ? 'نافذة'
        : n.includes('furniture') ? 'أثاث'
        : n.includes('furnishing') ? 'فرش أو أثاث'
        : n.includes('wall') ? 'جدار'
        : n.includes('room') ? 'عناصر الغرفة'
        : n.includes('indoor') ? 'عنصر داخلي'
        : (() => { const first = (n.split(' ')[0] ?? n).replace(/_/g, ' '); return first ? `عنصر مشابه لـ ${first}` : 'عنصر في بيئة الغرفة'; })();
    const contextInterpretation =
      'يمكن دمج العنصر في أنشطة علاجية (جلوس، نقل، لعب، تنظيم) بعد تقييم السلامة والوظيفة والملاءمة العمرية.';
    return {
      rawLabel: className,
      elementNameAr: safeName,
      functionalCategory: FUNCTIONAL_CATEGORIES.dailyUse,
      contextualInterpretation: contextInterpretation,
      confidenceAfterProcessing: confidence * 0.85,
    };
  }

  // Low relevance or unclear: return with label-derived name and functionally meaningful context (no generic placeholder).
  if (rel >= 0.5) {
    const firstWord = n.split(' ')[0] ?? n;
    const transliterated = firstWord.replace(/_/g, ' ');
    const nameAr = transliterated ? `عنصر (${transliterated}) — يُفضّل التأكد من السياق` : 'عنصر — يُفضّل التأكد من السياق';
    return {
      rawLabel: className,
      elementNameAr: nameAr,
      functionalCategory: FUNCTIONAL_CATEGORIES.dailyUse,
      contextualInterpretation: 'تصنيف أولي من الصورة؛ يُنصح بمراعاة السياق الفعلي للغرفة وملاءمة العمر قبل تصميم النشاط.',
      confidenceAfterProcessing: confidence * 0.6,
    };
  }

  return null;
}

/**
 * Run AI reasoning on MobileNet predictions.
 * Returns only relevant, context-aware elements; filters irrelevant/culturally inappropriate.
 * Sorted so tangible, interaction-based objects come first; structural/background last.
 * All output in professional Arabic.
 */
export function reasonOverDetections(predictions: RawPrediction[]): ReasonedElement[] {
  const seen = new Set<string>();
  const out: ReasonedElement[] = [];

  for (const p of predictions) {
    const n = norm(p.className);
    if (seen.has(n)) continue;
    const el = interpretOne(p.className, p.probability);
    if (el && el.confidenceAfterProcessing >= 0.35) {
      seen.add(n);
      out.push(el);
    }
  }

  // Prioritize tangible, interaction-based objects; put structural/background last
  out.sort((a, b) => {
    const pa = interactionPriorityScore(norm(a.rawLabel));
    const pb = interactionPriorityScore(norm(b.rawLabel));
    if (pb !== pa) return pb - pa;
    return b.confidenceAfterProcessing - a.confidenceAfterProcessing;
  });

  return out;
}
