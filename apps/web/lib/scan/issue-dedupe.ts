/**
 * Deduplicate accessibility issues from axe and HTML CodeSniffer when they
 * report the same finding (same element, same logical rule).
 */

import type { Issue } from './types';

const MAX_SELECTOR_LENGTH = 500;

/**
 * Normalize selector for grouping: trim and cap length.
 */
export function normalizeSelector(selector: string): string {
    const s = (selector || '').trim();
    return s.length > MAX_SELECTOR_LENGTH ? s.slice(0, MAX_SELECTOR_LENGTH) : s;
}

/**
 * HTML CodeSniffer sniffer code (e.g. H37) → axe rule ID for same logical rule.
 * Used so axe and htmlcs findings on the same element map to the same rule group.
 */
const HTMLCS_SNIFFER_TO_AXE: Record<string, string> = {
    H37: 'image-alt',       // img alt
    H36: 'input-image-alt', // input type=image alt
    H35: 'input-image-alt',
    G94: 'button-name',     // button/link accessible name
    H64: 'frame-title',     // frame title
    F24: 'bypass',          // skip link / bypass blocks
    G138: 'color-contrast', // color contrast (approx)
    H32: 'label',           // label for input
    H93: 'label',
    G18: 'color-contrast',
    H57: 'document-title',  // document title
    H71: 'document-title',
    H73: 'document-title',
    H78: 'document-title',
    H79: 'document-title',
    H81: 'document-title',
    H2: 'link-name',        // link text
    F84: 'link-name',
    H44: 'label',
    H65: 'html-has-lang',   // html lang
    H62: 'html-lang-valid',
    H91: 'aria-valid-attr',
    ARIA: 'aria-required-attr',
};

/**
 * Get a canonical rule group key for an issue so that axe and htmlcs
 * reporting the same rule (e.g. image-alt) share the same key.
 */
export function getRuleGroup(issue: Issue): string {
    if (issue.runner === 'axe') return issue.code;
    // HTML CodeSniffer: code is like "WCAG2AA.Principle1.Guideline1_1.1_1_1.H37"
    const lastSegment = issue.code.split('.').pop() ?? issue.code;
    const axeEquivalent = HTMLCS_SNIFFER_TO_AXE[lastSegment];
    return axeEquivalent ?? issue.code;
}

/**
 * Deduplicate issues: same normalized selector + same rule group → keep one.
 * Prefer the issue with a known WCAG level (usually htmlcs), then first in list.
 */
export function deduplicateIssues(issues: Issue[]): Issue[] {
    const groupKey = (issue: Issue) =>
        `${normalizeSelector(issue.selector)}::${getRuleGroup(issue)}`;
    const byKey = new Map<string, Issue[]>();
    for (const issue of issues) {
        const key = groupKey(issue);
        const list = byKey.get(key) ?? [];
        list.push(issue);
        byKey.set(key, list);
    }
    const out: Issue[] = [];
    for (const list of byKey.values()) {
        const preferred = list.reduce((best, cur) => {
            if (best.wcagLevel !== 'Unknown' && cur.wcagLevel === 'Unknown') return best;
            if (cur.wcagLevel !== 'Unknown' && best.wcagLevel === 'Unknown') return cur;
            return best; // keep first when same level
        });
        out.push(preferred);
    }
    return out;
}
