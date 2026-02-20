/**
 * Universal safety and physical feasibility validation layer.
 * Runs before activity generation. Classifies objects, applies age-adjusted
 * feasibility, and ensures no unsafe activities (lifting heavy furniture,
 * dragging, climbing unstable surfaces, etc.) are suggested.
 */

import type { EnvironmentElement } from './environment';
import type { TherapeuticFocus } from './environment';

/** Environmental object classification for safety. */
export type ObjectSafetyClass =
  | 'fixed_heavy_furniture'
  | 'large_movable'
  | 'small_manipulable'
  | 'elevated_unstable'
  | 'floor_safe';

/** Actions that must never be suggested for heavy/fixed objects. */
export type ForbiddenAction =
  | 'lift'
  | 'drag'
  | 'push'
  | 'climb_unstable'
  | 'jump_from_height'
  | 'high_force';

/** Safe alternatives when object is heavy or fixed. */
export type SafeActionHint =
  | 'crawl_around'
  | 'navigate_between'
  | 'reach_over'
  | 'use_cushions_or_floor'
  | 'supported_weight_bearing';

/** Extended element with safety metadata (attached by this layer). */
export interface SafetyMetadata {
  classes: ObjectSafetyClass[];
  forbiddenActions: ForbiddenAction[];
  safeActionHints: SafeActionHint[];
  useSafeAlternativesOnly: boolean;
}

/** Age-adjusted feasibility constraints. */
export interface AgeFeasibility {
  maxStrengthDemand: 'minimal' | 'light' | 'moderate' | 'full';
  maxBalanceComplexity: 'static_only' | 'simple_dynamic' | 'moderate_dynamic' | 'complex';
  maxMotorPlanningLoad: 'single_step' | 'two_steps' | 'three_steps' | 'multi_step';
  allowElevatedSurfaces: boolean;
  allowUnstableSurfaces: boolean;
}

// --- Object classification (fixed heavy, large movable, small, elevated/unstable, floor-safe) ---

const FIXED_HEAVY_LABELS: readonly string[] = [
  'sofa', 'couch', 'bed', 'wardrobe', 'bookcase', 'cabinet', 'dining table',
  'table', 'desk', 'stairs', 'door', 'wall', 'refrigerator', 'bathtub', 'tub',
];
const LARGE_MOVABLE_LABELS: readonly string[] = [
  'bench', 'ottoman', 'mattress', 'coffee table',
];
const SMALL_MANIPULABLE_LABELS: readonly string[] = [
  'pillow', 'blanket', 'ball', 'book', 'lamp', 'cushion', 'box', 'basket',
  'toy', 'doll', 'block', 'cube', 'remote', 'phone', 'cup', 'plate', 'bowl',
];
const ELEVATED_UNSTABLE_LABELS: readonly string[] = [
  'stairs', 'step', 'stool', 'window', 'lamp',
];

function normalizeForSafety(label: string): string {
  return label.split(',')[0].trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '');
}

function labelMatches(label: string, keys: readonly string[]): boolean {
  const base = normalizeForSafety(label);
  const normalized = base.replace(/_/g, '');
  for (const key of keys) {
    const k = key.replace(/\s+/g, '');
    if (normalized.includes(k) || k.includes(normalized)) return true;
  }
  return false;
}

/**
 * Classify an environment element into safety classes and derive forbidden actions
 * and safe alternative hints. Does not mutate the element; returns metadata.
 */
export function classifyElementForSafety(element: EnvironmentElement): SafetyMetadata {
  const label = element.objectLabel;
  const base = normalizeForSafety(label);
  const classes: ObjectSafetyClass[] = [];
  const forbiddenActions: ForbiddenAction[] = [];
  const safeActionHints: SafeActionHint[] = [];

  // Fixed heavy furniture → no lift, drag, push, high_force
  if (labelMatches(label, FIXED_HEAVY_LABELS) || element.stability === 'fixed') {
    if (base.includes('sofa') || base.includes('couch') || base.includes('bed') ||
        base.includes('wardrobe') || base.includes('bookcase') || base.includes('table') ||
        base.includes('desk') || base.includes('stairs') || base.includes('door') ||
        base.includes('wall') || base.includes('refrigerator') || base.includes('tub')) {
      classes.push('fixed_heavy_furniture');
      forbiddenActions.push('lift', 'drag', 'push', 'high_force');
      safeActionHints.push('crawl_around', 'navigate_between', 'reach_over', 'use_cushions_or_floor', 'supported_weight_bearing');
    }
  }

  // Large movable (still do not suggest lifting/dragging by child)
  if (labelMatches(label, LARGE_MOVABLE_LABELS) && !classes.includes('fixed_heavy_furniture')) {
    classes.push('large_movable');
    forbiddenActions.push('lift', 'drag', 'push', 'high_force');
    safeActionHints.push('crawl_around', 'navigate_between', 'reach_over', 'use_cushions_or_floor', 'supported_weight_bearing');
  }

  // Small manipulable → no extra restrictions
  if (labelMatches(label, SMALL_MANIPULABLE_LABELS)) {
    classes.push('small_manipulable');
  }

  // Elevated or unstable
  if (element.height === 'elevated' || labelMatches(label, ELEVATED_UNSTABLE_LABELS)) {
    classes.push('elevated_unstable');
    forbiddenActions.push('climb_unstable', 'jump_from_height');
    if (!safeActionHints.length) {
      safeActionHints.push('navigate_between', 'reach_over', 'supported_weight_bearing');
    }
  }

  // Floor-level safe
  if (element.height === 'floor' || labelMatches(label, ['carpet', 'rug', 'floor', 'ball'])) {
    classes.push('floor_safe');
  }

  // Default: if no class yet, treat as small_manipulable for safety
  if (classes.length === 0) {
    classes.push('small_manipulable');
  }

  const useSafeAlternativesOnly =
    classes.includes('fixed_heavy_furniture') || classes.includes('large_movable');

  return {
    classes,
    forbiddenActions: [...new Set(forbiddenActions)],
    safeActionHints: [...new Set(safeActionHints)],
    useSafeAlternativesOnly,
  };
}

/**
 * Get age-adjusted feasibility (strength, balance, motor planning).
 */
export function getAgeFeasibility(age: number): AgeFeasibility {
  if (age < 3) {
    return {
      maxStrengthDemand: 'minimal',
      maxBalanceComplexity: 'static_only',
      maxMotorPlanningLoad: 'single_step',
      allowElevatedSurfaces: false,
      allowUnstableSurfaces: false,
    };
  }
  if (age < 5) {
    return {
      maxStrengthDemand: 'light',
      maxBalanceComplexity: 'simple_dynamic',
      maxMotorPlanningLoad: 'two_steps',
      allowElevatedSurfaces: false,
      allowUnstableSurfaces: false,
    };
  }
  if (age < 8) {
    return {
      maxStrengthDemand: 'moderate',
      maxBalanceComplexity: 'moderate_dynamic',
      maxMotorPlanningLoad: 'three_steps',
      allowElevatedSurfaces: false,
      allowUnstableSurfaces: false,
    };
  }
  return {
    maxStrengthDemand: 'full',
    maxBalanceComplexity: 'complex',
    maxMotorPlanningLoad: 'multi_step',
    allowElevatedSurfaces: true,
    allowUnstableSurfaces: false,
  };
}

/** Focuses that imply lifting, moving, or high force when applied to heavy/fixed objects. */
const FOCUS_IMPLIES_FORCE: Partial<Record<TherapeuticFocus, boolean>> = {
  motor_planning: true,   // often "lift X, walk, put"
  fine_motor: true,       // "lift to shoulder", "place in target"
  bilateral_coordination: true, // "lift with both hands", "transfer"
  executive_function: true, // "move elements in order"
  gross_motor: false,     // can be walk toward, balance beside — safe if no climb
  sensory_regulation: false, // touch, look — safe
};

/**
 * Check if an activity (element + focus + age) is physically safe and feasible.
 */
export function isActivitySafe(
  objectLabel: string,
  therapeuticFocus: TherapeuticFocus,
  element: EnvironmentElement,
  age: number,
  safetyMeta: SafetyMetadata
): boolean {
  const feasibility = getAgeFeasibility(age);

  // Heavy/fixed + focus that implies force → unsafe
  if (safetyMeta.useSafeAlternativesOnly && FOCUS_IMPLIES_FORCE[therapeuticFocus]) {
    return false; // Will be replaced with safe alternative or safe phrasing
  }

  // Elevated/unstable + young age or focus that implies climbing
  if (safetyMeta.classes.includes('elevated_unstable')) {
    if (!feasibility.allowElevatedSurfaces && (therapeuticFocus === 'gross_motor' || therapeuticFocus === 'motor_planning')) {
      return false;
    }
    if (safetyMeta.forbiddenActions.includes('climb_unstable') && therapeuticFocus === 'gross_motor') {
      return false;
    }
  }

  return true;
}

/**
 * Enrich environment elements with safety classification. Mutates each element
 * by attaching safety metadata on a well-known optional field.
 */
export function enrichElementsWithSafety(elements: EnvironmentElement[]): void {
  for (const el of elements) {
    el._safety = classifyElementForSafety(el);
  }
}

/**
 * Get safety metadata for an element (after enrichElementsWithSafety).
 */
export function getSafetyMetadata(element: EnvironmentElement | undefined): SafetyMetadata | undefined {
  if (!element) return undefined;
  return element._safety;
}

/**
 * Returns true if this element must use safe-alternative phrasing only (no lift/drag/push).
 */
export function mustUseSafeAlternatives(element: EnvironmentElement | undefined): boolean {
  const meta = getSafetyMetadata(element);
  return meta?.useSafeAlternativesOnly ?? false;
}

const ALL_FOCUSES: TherapeuticFocus[] = [
  'sensory_regulation',
  'motor_planning',
  'executive_function',
  'fine_motor',
  'gross_motor',
  'bilateral_coordination',
];

type ActivityCandidate = {
  objectLabel: string;
  therapeuticFocus: TherapeuticFocus;
  element: EnvironmentElement;
};

/**
 * Validate activities and replace any that pose physical risk with a safer
 * therapeutic alternative (same or different element, safe focus/action).
 * Safety overrides creativity. Does not re-run image analysis.
 */
export function validateAndReplaceActivities(
  activities: ActivityCandidate[],
  elements: EnvironmentElement[],
  age: number
): ActivityCandidate[] {
  const result: ActivityCandidate[] = [];
  const used = new Set<string>();

  for (const a of activities) {
    const meta = getSafetyMetadata(a.element);
    const safe = meta
      ? isActivitySafe(a.objectLabel, a.therapeuticFocus, a.element, age, meta)
      : true;

    if (safe) {
      result.push(a);
      used.add(`${a.objectLabel}-${a.therapeuticFocus}`);
      continue;
    }

    // Replace with safe alternative: prefer same element with a focus that does not imply force,
    // or same focus with a small_manipulable / floor_safe element.
    const safeFocuses: TherapeuticFocus[] = meta?.useSafeAlternativesOnly
      ? ['sensory_regulation', 'gross_motor'] // walk toward, balance beside, touch, look — no lift/move
      : ALL_FOCUSES;

    let replaced = false;
    for (const focus of safeFocuses) {
      if (FOCUS_IMPLIES_FORCE[focus] && meta?.useSafeAlternativesOnly) continue;
      const key = `${a.objectLabel}-${focus}`;
      if (used.has(key)) continue;
      const altMeta = getSafetyMetadata(a.element);
      if (altMeta && !isActivitySafe(a.objectLabel, focus, a.element, age, altMeta)) continue;
      result.push({ objectLabel: a.objectLabel, therapeuticFocus: focus, element: a.element });
      used.add(key);
      replaced = true;
      break;
    }

    if (!replaced) {
      // Try another element that is small_manipulable or floor_safe
      for (const el of elements) {
        if (el === a.element) continue;
        const elMeta = getSafetyMetadata(el);
        if (elMeta?.useSafeAlternativesOnly) continue;
        const key = `${el.objectLabel}-${a.therapeuticFocus}`;
        if (used.has(key)) continue;
        if (!isActivitySafe(el.objectLabel, a.therapeuticFocus, el, age, elMeta ?? classifyElementForSafety(el))) continue;
        result.push({ objectLabel: el.objectLabel, therapeuticFocus: a.therapeuticFocus, element: el });
        used.add(key);
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      // Last resort: keep same activity but formatter will use safe-alternative steps (no lift/drag)
      result.push(a);
      used.add(`${a.objectLabel}-${a.therapeuticFocus}`);
    }
  }

  return result;
}
