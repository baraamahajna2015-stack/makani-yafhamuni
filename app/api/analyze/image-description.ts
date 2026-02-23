/**
 * Builds a brief (2–3 sentence) image description in Arabic from detected labels.
 * Used to give a concise, structured summary of what appears in the image.
 */

export function getBriefImageDescription(labelsArabic: string[]): string {
  if (!labelsArabic.length) {
    return 'لم يتم التعرف على عناصر محددة في الصورة.';
  }

  const main = labelsArabic.slice(0, 4);
  const firstPart =
    main.length === 1
      ? `تظهر في الصورة ${main[0]}.`
      : main.length === 2
        ? `تظهر في الصورة ${main[0]} و${main[1]}.`
        : main.length === 3
          ? `تظهر في الصورة ${main[0]} و${main[1]} و${main[2]}.`
          : `تظهر في الصورة ${main[0]} و${main[1]} و${main[2]} و${main[3]}.`;

  const secondPart =
    'يمكن تصميم أنشطة تعليمية مخصّصة تعتمد على هذه العناصر.';

  return `${firstPart} ${secondPart}`;
}
