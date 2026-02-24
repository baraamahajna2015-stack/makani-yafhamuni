/**
 * Scene Reasoning Layer — runs AFTER object detection.
 * Reads already extracted objects, groups them into environment categories,
 * and infers scene type. Does not modify or suppress any existing detections.
 * Output: optional "environmentSummary" (Arabic) when a pattern matches.
 */

/** Normalize label for matching (lowercase, first segment only). */
function norm(label: string): string {
  return label.split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Set of normalized labels from the detection pipeline. */
function toNormalizedSet(labels: string[]): Set<string> {
  const set = new Set<string>();
  for (const l of labels) {
    const n = norm(l);
    if (n) set.add(n);
  }
  return set;
}

/** Check if set contains any of the given keywords (substring or whole word). */
function hasAny(set: Set<string>, keywords: string[]): boolean {
  for (const key of keywords) {
    for (const n of set) {
      if (n.includes(key) || key.includes(n)) return true;
    }
  }
  return false;
}

/**
 * Infer scene type from detected object labels.
 * Returns Arabic environment summary only when a known pattern matches;
 * otherwise returns null (skip scene summary silently).
 */
export function inferSceneFromObjects(labels: string[]): string | null {
  if (!labels.length) return null;
  const set = toNormalizedSet(labels);

  // غرفة نوم — bed + pillow (or blanket/quilt)
  const bedroomRest = ['bed'];
  const bedroomSoft = ['pillow', 'blanket', 'quilt', 'mattress'];
  if (hasAny(set, bedroomRest) && hasAny(set, bedroomSoft)) {
    return 'غرفة نوم';
  }

  // زاوية تعلم — table/desk + chair
  const workSurface = ['table', 'desk'];
  const seating = ['chair', 'stool', 'bench'];
  if (hasAny(set, workSurface) && hasAny(set, seating)) {
    return 'زاوية تعلم';
  }

  // غرفة جلوس — sofa/couch + tv/screen
  const livingSeating = ['sofa', 'couch', 'settee'];
  const screen = ['television', 'tv', 'monitor', 'screen'];
  if (hasAny(set, livingSeating) && hasAny(set, screen)) {
    return 'غرفة جلوس';
  }

  // غرفة أطفال — toys + small furniture (stool, small table, etc.)
  const toys = ['toy', 'doll', 'teddy', 'ball', 'block', 'puzzle', 'lego', 'game'];
  const smallFurniture = ['stool', 'bench', 'ottoman', 'chair'];
  if (hasAny(set, toys) && hasAny(set, smallFurniture)) {
    return 'غرفة أطفال';
  }

  // Optional: sofa/couch alone with no stronger pattern → غرفة جلوس (weaker)
  if (hasAny(set, livingSeating) && !hasAny(set, bedroomRest)) {
    return 'غرفة جلوس';
  }

  return null;
}
