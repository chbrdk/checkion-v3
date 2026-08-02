/**
 * Re-verify link-in-text-block: stacking/transparent layers can make axe think a link
 * is only distinguished by color when underline, weight, or 3:1 text contrast exists.
 */
import type { Page } from 'puppeteer';
import { getRuleGroup } from '@/lib/scan/issue-dedupe';
import type { Issue } from '@/lib/scan/types';

export type LinkInTextBlockFilterResult = {
  issues: Issue[];
  removedCount: number;
};

const BROWSER_VERIFY_FN = function (selectors: string[]) {
  function parseRgba(value: string) {
    const m = value
      .trim()
      .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (!m) return null;
    return {
      r: Math.round(Number(m[1])),
      g: Math.round(Number(m[2])),
      b: Math.round(Number(m[3])),
      a: m[4] != null ? Number(m[4]) : 1,
    };
  }

  function luminance(rgb: { r: number; g: number; b: number }) {
    const ch = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return ch(rgb.r) * 0.2126 + ch(rgb.g) * 0.7152 + ch(rgb.b) * 0.0722;
  }

  function ratio(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  return selectors.map((selector) => {
    try {
      const link = document.querySelector(selector);
      if (!link) return { selector, pass: null as boolean | null };
      const style = getComputedStyle(link);
      const deco = `${style.textDecorationLine} ${style.textDecorationStyle}`;
      if (deco.includes('underline') || deco.includes('solid') || deco.includes('double')) {
        return { selector, pass: true };
      }
      const borderBottom = style.borderBottomWidth;
      if (borderBottom && parseFloat(borderBottom) > 0) return { selector, pass: true };

      const parent = link.parentElement;
      if (!parent) return { selector, pass: null };

      const parentStyle = getComputedStyle(parent);
      const linkWeight = parseInt(style.fontWeight, 10) || 400;
      const parentWeight = parseInt(parentStyle.fontWeight, 10) || 400;
      if (linkWeight >= 700 && parentWeight < 700) return { selector, pass: true };
      if (style.fontStyle === 'italic' && parentStyle.fontStyle !== 'italic') return { selector, pass: true };

      const linkColor = parseRgba(style.color);
      const parentColor = parseRgba(parentStyle.color);
      if (linkColor && parentColor) {
        const contrast = ratio(linkColor, parentColor);
        if (contrast >= 3) return { selector, pass: true };
      }
      return { selector, pass: false };
    } catch {
      return { selector, pass: null as boolean | null };
    }
  });
};

function isLinkInTextBlockIssue(issue: Issue): boolean {
  return getRuleGroup(issue) === 'link-in-text-block';
}

export async function filterLinkInTextBlockFalsePositives(
  page: Page,
  issues: Issue[]
): Promise<LinkInTextBlockFilterResult> {
  const targets = issues.filter((issue) => isLinkInTextBlockIssue(issue) && issue.selector.trim());
  if (!targets.length) return { issues, removedCount: 0 };

  const selectors = [...new Set(targets.map((t) => t.selector.trim()))];
  let browserResults: Array<{ selector: string; pass: boolean | null }> = [];
  try {
    browserResults = (await page.evaluate(BROWSER_VERIFY_FN, selectors)) as Array<{
      selector: string;
      pass: boolean | null;
    }>;
  } catch {
    return { issues, removedCount: 0 };
  }

  const passBySelector = new Map(browserResults.map((row) => [row.selector, row.pass]));
  let removedCount = 0;
  const kept = issues.filter((issue) => {
    if (!isLinkInTextBlockIssue(issue)) return true;
    const pass = passBySelector.get(issue.selector.trim());
    if (pass === true) {
      removedCount++;
      return false;
    }
    return true;
  });

  return { issues: kept, removedCount };
};
