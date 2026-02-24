/**
 * Detected element validation layer (after localization, before activity generation).
 * Keeps only realistic, tangible, developmentally relevant objects for a child's environment.
 * Excludes unlikely, abstract, or misdetected elements. Does not modify AI vision logic.
 */

import type { ReasonedElement } from './ai-reasoning';

/** Keywords that indicate realistic, tangible, developmentally relevant objects in a child's environment. */
const ALLOWLIST_KEYWORDS: readonly string[] = [
  'couch', 'sofa', 'chair', 'table', 'desk', 'bed', 'pillow', 'blanket', 'quilt',
  'carpet', 'rug', 'floor', 'ball', 'stairs', 'step', 'stool', 'bench', 'ottoman',
  'lamp', 'door', 'window', 'wall', 'book', 'bookcase', 'shelf', 'wardrobe', 'cabinet',
  'drawer', 'box', 'basket', 'bike', 'bicycle', 'toy', 'doll', 'teddy', 'block', 'cube',
  'puzzle', 'lego', 'tv', 'television', 'monitor', 'laptop', 'computer', 'phone', 'remote',
  'keyboard', 'cushion', 'mattress', 'plant', 'vase', 'mirror', 'towel', 'bowl', 'plate',
  'cup', 'dining', 'coffee', 'highchair', 'bathtub', 'tub', 'sink', 'toilet', 'refrigerator',
  'oven', 'microwave', 'swing', 'board', 'card', 'notebook', 'backpack', 'screen',
  'printer', 'toaster', 'envelope', 'filing', 'copier', 'modem', 'cellular', 'telephone',
  'furniture', 'furnishing', 'seat', 'mat', 'cot',
];

/** Keywords that indicate unlikely, abstract, or common misdetections (not tangible room objects). */
const BLOCKLIST_KEYWORDS: readonly string[] = [
  'menu', 'scoreboard', 'website', 'web site', 'prom', 'book jacket', 'comic book',
  'comic', 'cartoon', 'snow', 'lakeside', 'landscape', 'gondola', 'barber', 'grocery',
  'bakery', 'prison', 'jail', 'nightclub', 'confederate', 'swastika', 'weapon', 'gun',
  'rifle', 'grenade', 'restaurant', 'dome', 'spot', 'mask',
];

/** Tangible, interaction-based objects (child can touch, move, use in activities). Prioritized first. */
const INTERACTION_FIRST_KEYWORDS: readonly string[] = [
  'ball', 'toy', 'doll', 'teddy', 'block', 'cube', 'puzzle', 'lego', 'book', 'pillow',
  'blanket', 'quilt', 'cushion', 'basket', 'box', 'bowl', 'plate', 'cup', 'towel', 'card',
  'notebook', 'remote', 'keyboard', 'carpet', 'rug', 'chair', 'stool', 'bench', 'ottoman',
  'table', 'desk', 'couch', 'sofa', 'bed', 'mat', 'shelf', 'drawer', 'bookcase', 'wardrobe',
  'cabinet', 'bike', 'bicycle', 'swing', 'lamp', 'mirror', 'plant', 'vase',
];

/** Background/structural elements; include only when needed to reach 3–5 objects. */
const STRUCTURAL_OR_BACKGROUND_KEYWORDS: readonly string[] = [
  'wall', 'floor', 'door', 'window', 'stairs', 'step',
];

/** Target: 3–5 contextually meaningful objects for the child's environment. */
const TARGET_OBJECT_COUNT_MAX = 5;

/** Minimum confidence to keep an element (avoids low-confidence misdetections). */
const MIN_CONFIDENCE = 0.4;

/** Age below which scissors and other small-parts items are excluded. */
const AGE_NO_SHARP_SMALL_PARTS = 3;

/** Labels to exclude for very young children (choking/safety or developmentally inappropriate). */
const EXCLUDE_FOR_YOUNG: readonly string[] = ['scissors', 'scissor'];

function normalize(label: string): string {
  return label
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizedKey(label: string): string {
  return normalize(label).replace(/\s+/g, '');
}

function matchesBlocklist(normalized: string): boolean {
  return BLOCKLIST_KEYWORDS.some((kw) => normalized.includes(kw));
}

function matchesAllowlist(label: string): boolean {
  const n = normalize(label);
  const key = normalizedKey(label);
  return ALLOWLIST_KEYWORDS.some(
    (kw) =>
      key.includes(kw.replace(/\s+/g, '')) ||
      n.includes(kw) ||
      (kw.length >= 3 && key.includes(kw))
  );
}

function excludedForAge(label: string, age: number): boolean {
  if (age >= AGE_NO_SHARP_SMALL_PARTS) return false;
  const n = normalize(label);
  return EXCLUDE_FOR_YOUNG.some((kw) => n.includes(kw));
}

/** Priority for ordering: 2 = tangible/interaction-based, 1 = neutral, 0 = structural/background. */
function interactionPriority(label: string): number {
  const n = normalize(label);
  const key = normalizedKey(label);
  if (INTERACTION_FIRST_KEYWORDS.some((kw) => key.includes(kw.replace(/\s+/g, '')) || n.includes(kw))) return 2;
  if (STRUCTURAL_OR_BACKGROUND_KEYWORDS.some((kw) => key.includes(kw.replace(/\s+/g, '')) || n.includes(kw))) return 0;
  return 1;
}

/**
 * Validates detected elements for contextual appropriateness in a child's environment.
 * Call after localization (reasoned elements / labels) and before activity generation.
 * Returns filtered labels and reasoned elements; existing data structure is unchanged.
 */
export function validateDetectedElements(
  labels: string[],
  reasonedElements: ReasonedElement[],
  age: number
): { labels: string[]; reasonedElements: ReasonedElement[] } {
  const reasonByRaw = new Map(reasonedElements.map((r) => [r.rawLabel, r]));

  const allowedRaw = new Set<string>();

  for (const label of labels) {
    const n = normalize(label);
    if (matchesBlocklist(n)) continue;
    if (!matchesAllowlist(label)) continue;
    if (excludedForAge(label, age)) continue;

    const re = reasonByRaw.get(label);
    if (re != null && re.confidenceAfterProcessing < MIN_CONFIDENCE) continue;

    allowedRaw.add(label);
  }

  let filteredLabels = labels.filter((l) => allowedRaw.has(l));
  const filteredReasoned = reasonedElements.filter((r) => allowedRaw.has(r.rawLabel));

  // Order by priority: tangible/interaction-based first, structural/background last; cap at 3–5 objects
  filteredLabels = filteredLabels
    .sort((a, b) => interactionPriority(b) - interactionPriority(a))
    .slice(0, TARGET_OBJECT_COUNT_MAX);
  const allowedSet = new Set(filteredLabels);
  const reasonedOrdered = filteredReasoned
    .filter((r) => allowedSet.has(r.rawLabel))
    .sort((a, b) => filteredLabels.indexOf(a.rawLabel) - filteredLabels.indexOf(b.rawLabel));

  return { labels: filteredLabels, reasonedElements: reasonedOrdered };
}
