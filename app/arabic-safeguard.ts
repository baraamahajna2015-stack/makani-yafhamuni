/**
 * Silent Arabic safeguard for detected element names (display-only).
 * - If the name is in English → translate to Arabic before rendering.
 * - If already in Arabic → return as-is.
 * Does not change analysis, API, data structures, or rendering flow.
 */

const ARABIC_SCRIPT_RANGE = /[\u0600-\u06FF\u0750-\u077F]/;
const HAS_LATIN = /[a-zA-Z]/;

/** Display-only English → Arabic map for object/element names (subset aligned with backend). */
const DISPLAY_TRANSLATIONS: Record<string, string> = {
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

function normalizeForLookup(s: string): string {
  return s
    .toLowerCase()
    .split(',')[0]
    .trim()
    .replace(/_/g, ' ');
}

function translateToArabic(name: string): string {
  const key = normalizeForLookup(name);
  if (DISPLAY_TRANSLATIONS[key]) return DISPLAY_TRANSLATIONS[key];
  for (const [en, ar] of Object.entries(DISPLAY_TRANSLATIONS)) {
    if (key.includes(en) || en.includes(key)) return ar;
  }
  return key;
}

/**
 * Ensures a detected element/object name is shown in Arabic.
 * - If the string contains Arabic script → returned unchanged.
 * - If it looks English (Latin script) → translated to Arabic when possible.
 */
export function ensureArabicDisplayName(name: string): string {
  if (!name || typeof name !== 'string') return name;
  const trimmed = name.trim();
  if (ARABIC_SCRIPT_RANGE.test(trimmed)) return trimmed;
  if (!HAS_LATIN.test(trimmed)) return trimmed;
  return translateToArabic(trimmed);
}
