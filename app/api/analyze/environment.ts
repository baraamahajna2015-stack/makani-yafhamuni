/**
 * Environmental analysis for therapeutic activity generation.
 * Extracts physical elements from detected labels and derives
 * spatial, motor, sensory, and risk attributes for environment-specific activities.
 */

import type { SafetyMetadata } from './safety-validation';

export type TherapeuticFocus =
  | 'sensory_regulation'
  | 'motor_planning'
  | 'executive_function'
  | 'fine_motor'
  | 'gross_motor'
  | 'bilateral_coordination';

export interface EnvironmentElement {
  objectLabel: string;
  /** Spatial: central, corner, against_wall, edge */
  position: 'central' | 'corner' | 'against_wall' | 'edge' | 'open';
  /** Height: floor, low (ankle-knee), mid (knee-hip), table (hip-shoulder), elevated */
  height: 'floor' | 'low' | 'mid' | 'table' | 'elevated';
  /** Stability for support and safety */
  stability: 'stable' | 'mobile' | 'fixed';
  /** Surrounding space for movement */
  space: 'spacious' | 'moderate' | 'constrained';
  /** Inferred texture/material */
  texture: 'soft' | 'hard' | 'mixed' | 'smooth' | 'unknown';
  /** Motor opportunities from this element */
  motor: TherapeuticFocus[];
  /** Sensory: vestibular, proprioceptive, tactile, visual */
  sensory: ('tactile' | 'visual' | 'proprioceptive' | 'vestibular')[];
  /** Environmental risks */
  risks: string[];
  /** Safety classification and safe-action hints (set by safety-validation layer) */
  _safety?: SafetyMetadata;
}

const HEIGHT_MAP: Record<string, EnvironmentElement['height']> = {
  couch: 'low', sofa: 'low', chair: 'mid', table: 'table', desk: 'table',
  bed: 'low', bench: 'mid', stool: 'mid', stairs: 'elevated', step: 'mid',
  ball: 'floor', carpet: 'floor', rug: 'floor', floor: 'floor',
  pillow: 'low', blanket: 'low', lamp: 'table', book: 'table',
  door: 'elevated', window: 'elevated', wall: 'elevated',
};

const STABILITY_MAP: Record<string, EnvironmentElement['stability']> = {
  couch: 'stable', sofa: 'stable', chair: 'stable', table: 'stable',
  desk: 'stable', bed: 'stable', bench: 'stable', stairs: 'fixed',
  ball: 'mobile', carpet: 'stable', rug: 'stable', floor: 'fixed',
  pillow: 'mobile', blanket: 'mobile', bike: 'mobile', bicycle: 'mobile',
};

const TEXTURE_MAP: Record<string, EnvironmentElement['texture']> = {
  couch: 'soft', sofa: 'soft', pillow: 'soft', blanket: 'soft',
  carpet: 'soft', rug: 'soft', ball: 'smooth', table: 'hard',
  chair: 'hard', desk: 'hard', floor: 'hard', wall: 'hard',
};

const MOTOR_MAP: Record<string, TherapeuticFocus[]> = {
  couch: ['gross_motor', 'sensory_regulation'],
  sofa: ['gross_motor', 'sensory_regulation'],
  chair: ['gross_motor', 'fine_motor', 'bilateral_coordination'],
  table: ['fine_motor', 'bilateral_coordination', 'executive_function'],
  desk: ['fine_motor', 'executive_function'],
  ball: ['gross_motor', 'bilateral_coordination', 'motor_planning'],
  stairs: ['gross_motor', 'motor_planning'],
  carpet: ['gross_motor', 'sensory_regulation', 'motor_planning'],
  rug: ['gross_motor', 'sensory_regulation'],
  bed: ['gross_motor', 'sensory_regulation'],
  pillow: ['fine_motor', 'sensory_regulation', 'bilateral_coordination'],
  blanket: ['bilateral_coordination', 'fine_motor', 'sensory_regulation'],
};

const RISK_MAP: Record<string, string[]> = {
  stairs: ['خطر السقوط على الدرج'],
  step: ['احتمال التعثر'],
  bike: ['حركة الدراجة'],
  bicycle: ['حركة الدراجة'],
  lamp: ['الحرارة أو السلك'],
  window: ['القرب من النافذة'],
  door: ['حركة الباب'],
};

const POSITION_OPTIONS: EnvironmentElement['position'][] = ['central', 'against_wall', 'corner', 'edge', 'open'];
const SPACE_OPTIONS: EnvironmentElement['space'][] = ['spacious', 'moderate', 'constrained'];

function normalizeLabel(label: string): string {
  return label.split(',')[0].trim().toLowerCase().replace(/\s+/g, '_');
}

function getMotorForLabel(label: string): TherapeuticFocus[] {
  const base = normalizeLabel(label).replace('_', '');
  for (const [key, val] of Object.entries(MOTOR_MAP)) {
    if (base.includes(key) || key.includes(base)) return val;
  }
  return ['fine_motor', 'gross_motor', 'bilateral_coordination'];
}

function getRisksForLabel(label: string): string[] {
  const base = normalizeLabel(label);
  for (const [key, val] of Object.entries(RISK_MAP)) {
    if (base.includes(key) || key.includes(base)) return [...val];
  }
  return [];
}

/** Target: 3–5 contextually meaningful, tangible elements for activity generation. */
const MAX_ENVIRONMENT_ELEMENTS = 5;

/**
 * Extract 3–5 concrete physical elements from detected labels (prioritized upstream),
 * with spatial position, height, stability, surrounding space, texture,
 * motor/sensory opportunities, and risks.
 */
export function analyzeEnvironment(labels: string[]): EnvironmentElement[] {
  const seen = new Set<string>();
  const elements: EnvironmentElement[] = [];
  let positionIndex = 0;
  const n = Math.min(labels.length, MAX_ENVIRONMENT_ELEMENTS);

  for (let i = 0; i < n && elements.length < MAX_ENVIRONMENT_ELEMENTS; i++) {
    const raw = labels[i];
    const base = raw.split(',')[0].trim().toLowerCase();
    const key = base.replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);

    const height = HEIGHT_MAP[base] ?? (base.includes('ball') || base.includes('block') ? 'floor' : 'mid');
    const stability = STABILITY_MAP[base] ?? 'stable';
    const texture = TEXTURE_MAP[base] ?? 'unknown';
    const motor = getMotorForLabel(raw);
    const risks = getRisksForLabel(raw);

    let sensory: EnvironmentElement['sensory'] = ['tactile', 'visual'];
    if (height === 'elevated' || base.includes('stairs') || base.includes('step')) sensory.push('vestibular', 'proprioceptive');
    if (texture !== 'unknown') sensory.push('tactile');

    const space = elements.length < 2 ? 'spacious' : elements.length < 4 ? 'moderate' : 'constrained';
    const position = POSITION_OPTIONS[positionIndex % POSITION_OPTIONS.length];
    positionIndex++;

    elements.push({
      objectLabel: raw,
      position,
      height,
      stability,
      space,
      texture,
      motor,
      sensory,
      risks,
    });
  }

  return elements;
}

const ALL_THERAPEUTIC_FOCUSES: TherapeuticFocus[] = [
  'sensory_regulation',
  'motor_planning',
  'executive_function',
  'fine_motor',
  'gross_motor',
  'bilateral_coordination',
];

/** Activity “type” for diversity: we aim for a spread across these. */
const DIVERSITY_BUCKETS: TherapeuticFocus[] = [
  'gross_motor',
  'fine_motor',
  'sensory_regulation',
  'executive_function',
  'motor_planning',
  'bilateral_coordination',
];

/**
 * Pick a therapeutic focus that fits this element (from its motor/sensory affordances)
 * and supports diversity (prefer focuses not yet used). Returns null if no good match.
 */
function pickFocusForElement(
  element: EnvironmentElement,
  usedFocuses: Set<TherapeuticFocus>,
  preferredOrder: TherapeuticFocus[]
): TherapeuticFocus | null {
  const allowed = element.motor.length ? element.motor : ALL_THERAPEUTIC_FOCUSES;
  // Prefer focuses that fit the element and haven’t been used yet
  for (const f of preferredOrder) {
    if (!allowed.includes(f)) continue;
    if (usedFocuses.has(f)) continue;
    return f;
  }
  // Fallback: any focus that fits the element
  for (const f of allowed) {
    if (!usedFocuses.has(f)) return f;
  }
  return null;
}

/**
 * Build 3–5 environment-specific activities, each tied to one element.
 * - Therapeutic focus is derived from the element’s actual affordances (motor/sensory).
 * - Ensures diversity: spread across gross motor, fine motor, sensory, cognitive/EF, bilateral.
 * - No repeated (element, focus) pairs; activities feel logically tied to what’s in the image.
 */
export function buildActivitiesFromEnvironment(
  elements: EnvironmentElement[],
  age: number,
  count: number = 5
): { objectLabel: string; therapeuticFocus: TherapeuticFocus; element: EnvironmentElement }[] {
  const activities: { objectLabel: string; therapeuticFocus: TherapeuticFocus; element: EnvironmentElement }[] = [];
  const usedFocuses = new Set<TherapeuticFocus>();
  const usedKeys = new Set<string>();
  if (elements.length === 0) return [];
  const targetCount = Math.max(3, Math.min(count, 5, elements.length * 2, ALL_THERAPEUTIC_FOCUSES.length));

  // Shuffle diversity order so we don’t always get the same sequence (gross → fine → sensory …)
  const preferredOrder = [...DIVERSITY_BUCKETS].sort(() => Math.random() - 0.5);
  // Shuffle elements so we don’t always pair “first label” with “first focus”
  const shuffledElements = [...elements].sort(() => Math.random() - 0.5);

  for (let i = 0; i < targetCount; i++) {
    let best: { element: EnvironmentElement; focus: TherapeuticFocus } | null = null;

    for (const element of shuffledElements) {
      const focus = pickFocusForElement(element, usedFocuses, preferredOrder);
      if (focus === null) continue;
      const key = `${element.objectLabel}-${focus}`;
      if (usedKeys.has(key)) continue;
      best = { element, focus };
      break;
    }

    if (best) {
      usedFocuses.add(best.focus);
      usedKeys.add(`${best.element.objectLabel}-${best.focus}`);
      activities.push({
        objectLabel: best.element.objectLabel,
        therapeuticFocus: best.focus,
        element: best.element,
      });
      continue;
    }

    // If we couldn’t find a new (element, focus), allow reusing a focus but with a different element
    for (const element of shuffledElements) {
      const focus = pickFocusForElement(element, new Set(), preferredOrder);
      if (focus === null) continue;
      const key = `${element.objectLabel}-${focus}`;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      activities.push({
        objectLabel: element.objectLabel,
        therapeuticFocus: focus,
        element,
      });
      break;
    }
  }

  return activities;
}
