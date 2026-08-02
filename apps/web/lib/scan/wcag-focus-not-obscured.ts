/** Axe / WCAG 2.2 focus-not-obscured rule ids (forward-compatible when enabled in axe). */
export const FOCUS_NOT_OBSCURED_RULE_IDS = new Set([
  'focus-not-obscured',
  'focus-not-obscured-minimum',
  'focus-not-obscured-enhanced',
]);

export function isFocusNotObscuredRule(code: string): boolean {
  return FOCUS_NOT_OBSCURED_RULE_IDS.has(code);
}
