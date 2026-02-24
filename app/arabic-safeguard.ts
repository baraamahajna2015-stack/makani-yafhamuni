/**
 * Strict Arabic mapping layer for detected element names (rendering only).
 * All detected object labels must pass through the localization function.
 * - If label is in English and a direct equivalent exists → translate to Arabic.
 * - If label is in English and no equivalent exists → return a clear Arabic descriptive label.
 * - If label is already in Arabic → return unchanged.
 * Never renders raw English in the UI. Does not modify AI analysis or API schema.
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

/** Fallback when no direct Arabic equivalent exists: clear descriptive label, never raw English. */
const FALLBACK_ARABIC_LABEL = "عنصر من البيئة";

function translateToArabic(name: string): string {
  const key = normalizeForLookup(name);
  if (DISPLAY_TRANSLATIONS[key]) return DISPLAY_TRANSLATIONS[key];
  for (const [en, ar] of Object.entries(DISPLAY_TRANSLATIONS)) {
    if (key.includes(en) || en.includes(key)) return ar;
  }
  return FALLBACK_ARABIC_LABEL;
}

/**
 * Localization mapping for detected element names. All labels must pass through this before rendering.
 * - Arabic script → returned unchanged.
 * - English (Latin) → accurate Arabic equivalent, or clear Arabic descriptive label if none exists.
 * Never returns raw English.
 */
export function ensureArabicDisplayName(name: string): string {
  if (!name || typeof name !== "string") return name;
  const trimmed = name.trim();
  if (ARABIC_SCRIPT_RANGE.test(trimmed)) return trimmed;
  if (!HAS_LATIN.test(trimmed)) return trimmed;
  return translateToArabic(trimmed);
}
