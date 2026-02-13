type TherapeuticFocus = 'sensory_regulation' | 'motor_planning' | 'executive_function' | 'fine_motor' | 'gross_motor' | 'bilateral_coordination';
type UserMode = 'parent' | 'therapist';

interface Activity {
  objectLabel: string;
  therapeuticFocus: TherapeuticFocus;
  description: string;
}

interface ArabicFormattedActivity {
  objectLabel: string;
  objectLabelArabic: string;
  therapeuticFocus: TherapeuticFocus;
  therapeuticFocusArabic: string;
  formattedArabic: {
    activityName: string;
    therapeuticGoal: string;
    implementationSteps: string[]; // Step-by-step instructions (minimum 4)
    ageAdaptations: string;
    successIndicators: string;
    safetyWarnings: string;
  };
}

// Object label translations (common objects)
const objectTranslations: Record<string, string> = {
  'couch': 'كنبة',
  'sofa': 'كنبة',
  'chair': 'كرسي',
  'table': 'طاولة',
  'ball': 'كرة',
  'bike': 'دراجة',
  'bicycle': 'دراجة',
  'swing': 'أرجوحة',
  'puzzle': 'لغز',
  'lego': 'ليغو',
  'block': 'مكعب',
  'cube': 'مكعب',
  'book': 'كتاب',
  'board': 'لوحة',
  'card': 'بطاقة',
  'stairs': 'درج',
  'step': 'درجة',
  'bench': 'مقعد',
  'toy': 'لعبة',
  'doll': 'دمية',
  'car': 'سيارة',
  'truck': 'شاحنة',
  'train': 'قطار',
  'plane': 'طائرة',
  'phone': 'هاتف',
  'computer': 'حاسوب',
  'screen': 'شاشة',
  'pillow': 'وسادة',
  'blanket': 'بطانية',
  'bed': 'سرير',
  'desk': 'مكتب',
  'lamp': 'مصباح',
  'door': 'باب',
  'window': 'نافذة',
  'wall': 'جدار',
  'floor': 'أرضية',
  'carpet': 'سجادة',
  'rug': 'سجادة',
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
  
  // Fallback: return transliterated version or original
  return baseLabel;
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
  userMode: UserMode
): ArabicFormattedActivity['formattedArabic'] {
  const objectLabelArabic = translateObjectLabel(activity.objectLabel);
  const ageDescriptor = translateAgeDescriptor(age, userMode);
  const baseObject = activity.objectLabel.split(',')[0].trim().toLowerCase();
  
  let activityName = '';
  let therapeuticGoal = '';
  let implementationSteps: string[] = [];
  let ageAdaptations = '';
  let successIndicators = '';
  let safetyWarnings = '';
  
  if (userMode === 'parent') {
    // Simple but structured Arabic for parents
    switch (activity.therapeuticFocus) {
      case 'sensory_regulation':
        activityName = `تهدئة الحواس مع ${objectLabelArabic}`;
        therapeuticGoal = 'مساعدة الطفل على تنظيم استجابته للمؤثرات الحسية والشعور بالهدوء';
        implementationSteps = [
          `اجعل ${objectLabelArabic} أمام ${ageDescriptor} على سطح مستوٍ وثابت`,
          `يلمس ${ageDescriptor} ${objectLabelArabic} بيديه عشر ثوانٍ؛ انتبه معه للقوام والشعور به`,
          `ينظر إلى ${objectLabelArabic} ويسمّي لونين على الأقل يراهما`,
          `يتنفس بعمق (أربع ثوانٍ شهيق، أربع زفير) وهو ينظر إلى ${objectLabelArabic}`,
          `أعد الخطوات من الثانية إلى الرابعة ثلاث مرات، مع راحة خمس عشرة ثانية بين كل مرة`
        ];
        ageAdaptations = age < 4 
          ? 'اختصر المدة إلى خمس ثوانٍ؛ استخدم كلمتين فقط: "لمس" و "نظر"'
          : age < 7
          ? 'عدّ تنازلياً (٣، ٢، ١) قبل الانتقال من خطوة إلى أخرى'
          : 'دعه يصف القوام والألوان بتفصيل أكثر؛ زد المدة إلى خمس عشرة ثانية';
        successIndicators = `يلمس ${objectLabelArabic} بهدوء؛ يسمّي لونين؛ تنفسه عميق وواضح؛ يظل هادئاً حتى نهاية النشاط`;
        safetyWarnings = `تأكد أن ${objectLabelArabic} لا أجزاء صغيرة فيه ولا حادة؛ إن كان صغير السن فلا يضعه في فمه`;
        break;
        
      case 'motor_planning':
        activityName = `التفكير ثم التنفيذ مع ${objectLabelArabic}`;
        therapeuticGoal = 'تعويد الطفل على التفكير في الخطوات قبل الحركة وتنفيذها بالترتيب';
        implementationSteps = [
          `ضع ${objectLabelArabic} عند نقطة البداية، وعلّم على نقطة الوصول على بُعد مترين`,
          `يقف ${ageDescriptor} بجانب ${objectLabelArabic} وينظر إلى نقطة الوصول خمس ثوانٍ`,
          `يقول بصوت مسموع: "سأرفع ${objectLabelArabic}، أمشي خطوتين، ثم أضعه هناك"`,
          `ينفذ ما قاله خطوة بخطوة، ويتوقف بعد كل خطوة`,
          `كرر النشاط ثلاث مرات؛ في المرة الثالثة غيّر الخطة (مثلاً: أربع خطوات بدل اثنتين)`
        ];
        ageAdaptations = age < 4
          ? 'اقصر المسافة على متر واحد؛ خطوة واحدة فقط؛ دلّه بيدك أو بإشارة واضحة'
          : age < 7
          ? 'خطوتان فقط؛ ذكّره بالخطة وهو ينفذ'
          : 'دعه يختار مساراً أصعب (مثلاً يدور حول شيء)؛ زد المسافة إلى ثلاثة أمتار';
        successIndicators = 'يذكر الخطة قبل أن يتحرك؛ ينفذ بالترتيب؛ يتوقف بعد كل خطوة؛ يغيّر الخطة عندما تطلب منه';
        safetyWarnings = 'المسار بين نقطة البداية والوصول خالٍ من العوائق؛ راقبه أثناء المشي حتى لا يعثر';
        break;
        
      case 'executive_function':
        activityName = `ترتيب وخطة مع ${objectLabelArabic}`;
        therapeuticGoal = 'تعزيز قدرة الطفل على وضع خطة وترتيب وتنفيذها دون تخطي خطوات';
        implementationSteps = [
          `ضع ${objectLabelArabic} وثلاثة أشياء أخرى على الطاولة دون ترتيب معين`,
          `ينظر ${ageDescriptor} إلى كل الأشياء عشر ثوانٍ دون أن يلمسها`,
          `يحدد الترتيب: "أولاً ${objectLabelArabic}، ثانياً كذا، ثالثاً كذا، أخيراً كذا"`,
          `ينفذ الترتيب كما قال؛ يتوقف بعد كل شيء ويتحقق أنه في مكانه`,
          `بعد الانتهاء يروي بالترتيب ماذا فعل (من ذاكرته دون النظر)`
        ];
        ageAdaptations = age < 4
          ? 'عنصران فقط؛ استخدم صوراً توضح الترتيب؛ قلل وقت النظر إلى خمس ثوانٍ'
          : age < 7
          ? 'ثلاثة عناصر؛ ساعده بلفظ الترتيب وهو يخطط'
          : 'أربعة أو خمسة عناصر؛ يمكنه أن يكتب الترتيب أولاً؛ أضف قاعدة (مثلاً: من الأصغر للأكبر)';
        successIndicators = 'يحدد الترتيب قبل أن يبدأ؛ ينفذ بنفس الترتيب؛ يتوقف ويتحقق بعد كل خطوة؛ يروي ما فعله بعد الانتهاء';
        safetyWarnings = 'كل العناصر آمنة (لا قطع صغيرة)؛ راقبه حتى لا يسقط شيئاً';
        break;
        
      case 'fine_motor':
        activityName = `اليد والأصابع مع ${objectLabelArabic}`;
        therapeuticGoal = 'تقوية تحكم الطفل بأصابعه ويديه وحركاته الدقيقة';
        implementationSteps = [
          `ضع ${objectLabelArabic} على سطح ثابت بارتفاع مريح لـ${ageDescriptor}`,
          `يمسك ${objectLabelArabic} بيده اليمنى (أو اليسرى إن كان أعسر) بالإبهام والسبابة والوسطى`,
          `يرفعه ببطء إلى مستوى كتفه ويثبته خمس ثوانٍ`,
          `يديره نصف دورة ببطء ثم يعيده كما كان`,
          `يضعه داخل دائرة مرسومة على بُعد نحو ثلاثين سنتمتراً`
        ];
        ageAdaptations = age < 4
          ? 'يستخدم كل الأصابع في القبض؛ ثلاث ثوانٍ فقط؛ دائرة أكبر (قطرها نحو ١٠ سم)'
          : age < 7
          ? 'قبضة بثلاث أصابع؛ دائرة متوسطة (نحو ٧ سم)'
          : 'قبضة أدق؛ دائرة أصغر (٥ سم)؛ زد المسافة إلى أربعين سنتمتراً';
        successIndicators = `يمسك بالقبضة المناسبة؛ يرفع ${objectLabelArabic} ثابتاً خمس ثوانٍ؛ يديره بسلاسة؛ يضعه داخل الدائرة بدقة`;
        safetyWarnings = `تأكد أن ${objectLabelArabic} غير ثقيل ولا حاد؛ أن يجلس أو يقف وظهره مستقيم`;
        break;
        
      case 'gross_motor':
        activityName = `حركة الجسم والتوازن مع ${objectLabelArabic}`;
        therapeuticGoal = 'تقوية حركة الجسم الكبيرة وتحقيق التوازن أثناء المشي والوقوف';
        implementationSteps = [
          `ضع ${objectLabelArabic} في منتصف مكان فارغ (نحو مترين في الاتجاهين)`,
          `يقف ${ageDescriptor} على بُعد خطوتين من ${objectLabelArabic}، قدماه بعرض الكتفين`,
          `يمشي ببطء نحو ${objectLabelArabic} أربع خطوات؛ ظهره مستقيم ومتوازن`,
          `عند الوصول يرفع رجلاً واحدة ويبقى متوازناً خمس ثوانٍ بجانب ${objectLabelArabic}`,
          `يمشي للخلف أربع خطوات إلى حيث بدأ؛ ونظره إلى ${objectLabelArabic}`
        ];
        ageAdaptations = age < 4
          ? 'خطوتان فقط؛ رفع الرجل ثلاث ثوانٍ؛ يمكنك مسك يده إن احتاج'
          : age < 7
          ? 'ثلاث خطوات؛ رفع الرجل أربع ثوانٍ؛ راقب توازنه'
          : 'ست خطوات؛ رفع الرجل سبع ثوانٍ؛ يمكن إضافة خطوة جانبية';
        successIndicators = 'يمشي بخطوات مستقرة؛ يحافظ على التوازن عند رفع الرجل؛ يرجع للخلف دون أن يفقد توازنه؛ وضعه صحيح طوال الوقت';
        safetyWarnings = 'المكان خالٍ من العوائق؛ الأرض غير زلقة؛ راقبه من قرب؛ لا أجسام حادة في المحيط';
        break;
        
      case 'bilateral_coordination':
        activityName = `اليدان معاً مع ${objectLabelArabic}`;
        therapeuticGoal = 'تعويد الطفل على استخدام يديه معاً بتنسيق (ثبات إحداهما وعمل الأخرى)';
        implementationSteps = [
          `ضع ${objectLabelArabic} على سطح ثابت أمام ${ageDescriptor}`,
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
        successIndicators = `يثبت ${objectLabelArabic} بيد واحدة دون حركة؛ ينفذ الحركة باليد الأخرى بدقة؛ يبدل اليدين بنجاح؛ ينقله بيديه معاً`;
        safetyWarnings = `تأكد أن ${objectLabelArabic} غير ثقيل؛ أن يجلس وظهره مستقيم؛ السطح ثابت`;
        break;
    }
  } else {
    // Professional OT terminology for therapists
    switch (activity.therapeuticFocus) {
      case 'sensory_regulation':
        activityName = `تدخل تنظيم حسي وتكامل حسي باستخدام ${objectLabelArabic}`;
        therapeuticGoal = 'تحسين معالجة المعلومات الحسية متعددة الأنظمة والتنظيم الذاتي لمستوى الإثارة';
        implementationSteps = [
          `تهيئة البيئة: وضع ${objectLabelArabic} على سطح ثابت؛ تقليل المنافسات الحسية (ضجيج، حركة زائدة)؛ إضاءة مناسبة`,
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
        safetyWarnings = `ضمان أن ${objectLabelArabic} خالٍ من أجزاء قابلة للبلع أو حواف حادة؛ مراقبة الإثارة وإيقاف النشاط عند فرط الإثارة (هياج أو انسحاب)؛ تخفيف شدة المحفزات حسب التحمل`;
        break;
        
      case 'motor_planning':
        activityName = `تدخل تخطيط حركي وتسلسل حركي باستخدام ${objectLabelArabic}`;
        therapeuticGoal = 'تحسين التخطيط الحركي والتسلسل الحركي والذاكرة الحركية والمرونة في تعديل الخطة';
        implementationSteps = [
          `تهيئة البيئة: وضع ${objectLabelArabic} عند نقطة البداية؛ تحديد نقطة الوصول على بُعد مترين؛ إخلاء المسار من العوائق؛ علامات بصرية عند الحاجة`,
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
        safetyWarnings = `مساحة خالية من العوائق بقطر ثلاثة أمتار على الأقل؛ سطح غير زلق؛ مراقبة وثيقة لمنع السقوط؛ أن يكون ${objectLabelArabic} متناسباً مع وزن الطفل`;
        break;
        
      case 'executive_function':
        activityName = `تدخل مهارات تنفيذية ووظائف معرفية باستخدام ${objectLabelArabic}`;
        therapeuticGoal = 'تحسين التخطيط والتنظيم والمرونة المعرفية والذاكرة العاملة وكبح الاندفاع';
        implementationSteps = [
          `تهيئة المهمة: وضع ${objectLabelArabic} مع ثلاثة أو أربعة عناصر أخرى بترتيب عشوائي على سطح عمل منظم؛ جميع العناصر مرئية وقابلة للوصول`,
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
        break;
        
      case 'fine_motor':
        activityName = `تدخل حركة دقيقة وتنسيق يدوي باستخدام ${objectLabelArabic}`;
        therapeuticGoal = 'تحسين الحركة الدقيقة والقبضة الوظيفية والتنسيق اليدوي والتنسيق البصري الحركي والتحكم الحركي';
        implementationSteps = [
          `تهيئة الوضعية: وضع ${objectLabelArabic} على سطح ثابت بارتفاع مناسب (مستوى الكوع)؛ جلوس صحيح (قدمان على الأرض، ظهر مستقيم، كتفان مرتاحان)`,
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
        break;
        
      case 'gross_motor':
        activityName = `تدخل حركة كلية وتكامل حسي حركي باستخدام ${objectLabelArabic}`;
        therapeuticGoal = 'تحسين الحركة الكلية والتوازن الديناميكي والتكامل الحسي الحركي والوعي المكاني والجسدي';
        implementationSteps = [
          `تهيئة البيئة: وضع ${objectLabelArabic} في منتصف مساحة خالية (قطر ثلاثة أمتار على الأقل)؛ إخلاء العوائق؛ سطح غير زلق؛ علامات بصرية للبداية والوصول`,
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
        break;
        
      case 'bilateral_coordination':
        activityName = `تدخل تنسيق ثنائي وتكامل بين نصفي الجسم باستخدام ${objectLabelArabic}`;
        therapeuticGoal = 'تحسين التنسيق الثنائي وتكامل نصفي الجسم والتخطيط الحركي الثنائي والتكامل الحسي';
        implementationSteps = [
          `تهيئة الوضعية: وضع ${objectLabelArabic} على سطح ثابت بارتفاع مناسب أمام الطفل؛ جلوس صحيح (قدمان على الأرض، ظهر مستقيم)`,
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
        break;
    }
  }
  
  return {
    activityName,
    therapeuticGoal,
    implementationSteps,
    ageAdaptations,
    successIndicators,
    safetyWarnings,
  };
}

export function formatActivitiesInArabic(
  activities: Activity[],
  labels: string[],
  age: number,
  userMode: UserMode
): {
  labelsArabic: string[];
  activitiesArabic: ArabicFormattedActivity[];
} {
  const labelsArabic = labels.map(translateObjectLabel);
  
  const activitiesArabic: ArabicFormattedActivity[] = activities.map((activity) => {
    const therapeuticFocusArabic = therapeuticFocusTranslations[activity.therapeuticFocus][userMode];
    const formattedArabic = formatActivityInArabic(activity, age, userMode);
    
    return {
      objectLabel: activity.objectLabel,
      objectLabelArabic: translateObjectLabel(activity.objectLabel),
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
