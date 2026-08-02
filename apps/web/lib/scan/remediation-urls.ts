/**
 * Remediation / documentation URLs for WCAG issues.
 * Used for "Fix anzeigen" links in issue lists.
 */

import type { Runner } from './types';

/** Deque University – axe-core rule documentation */
export const REMEDIATION_AXE_BASE = 'https://dequeuniversity.com/rules/axe/4.10';
/** W3C WCAG 2.1 Quick Reference */
export const REMEDIATION_WCAG_QUICKREF = 'https://www.w3.org/WAI/WCAG21/quickref/';

/**
 * Get documentation URL for an issue.
 * - axe rules (e.g. color-contrast): Deque University
 * - htmlcs rules (WCAG path): W3C Quick Ref (code may help with hash in future)
 */
export function getRemediationUrl(code: string, runner: Runner): string | null {
  if (!code?.trim()) return null;
  const c = code.trim();

  // axe: kebab-case IDs like "color-contrast", "image-alt"
  if (runner === 'axe' && /^[a-z0-9-]+$/i.test(c)) {
    return `${REMEDIATION_AXE_BASE}/${encodeURIComponent(c)}`;
  }

  // htmlcs: WCAG path like "WCAG2AA.Principle1.Guideline1_1.1_1_1.H37"
  if (runner === 'htmlcs') {
    return REMEDIATION_WCAG_QUICKREF;
  }

  return null;
}
