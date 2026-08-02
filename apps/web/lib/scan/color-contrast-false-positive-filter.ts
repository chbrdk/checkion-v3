/**
 * Filter axe/htmlcs color-contrast findings that fail in pa11y but pass a simpler
 * computed-style check (common false positives on solid brand colors, e.g. black on yellow).
 */
import type { Page } from 'puppeteer';
import { getRuleGroup } from '@/lib/scan/issue-dedupe';
import {
  contrastRatio,
  parseContrastFromAxeMessage,
  requiredAaContrastRatio,
  isLargeText,
} from '@/lib/scan/wcag-contrast-math';
import type { Issue } from '@/lib/scan/types';

export type ContrastFilterResult = {
  issues: Issue[];
  removedCount: number;
};

const BROWSER_VERIFY_FN = function (
  entries: Array<{ selector: string; requiredNormal: number; requiredLarge: number }>
) {
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

  function blend(fg: { r: number; g: number; b: number; a: number }, bg: { r: number; g: number; b: number }) {
    const a = Math.max(0, Math.min(1, fg.a));
    if (a >= 1) return { r: fg.r, g: fg.g, b: fg.b };
    return {
      r: Math.round(fg.r * a + bg.r * (1 - a)),
      g: Math.round(fg.g * a + bg.g * (1 - a)),
      b: Math.round(fg.b * a + bg.b * (1 - a)),
    };
  }

  function luminance(rgb: { r: number; g: number; b: number }) {
    const ch = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return ch(rgb.r) * 0.2126 + ch(rgb.g) * 0.7152 + ch(rgb.b) * 0.0722;
  }

  function ratio(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }) {
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function resolveBackground(el: Element) {
    let node: Element | null = el;
    let stack: Array<{ r: number; g: number; b: number; a: number }> = [];
    while (node && node !== document.documentElement.parentElement) {
      const bg = parseRgba(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0) stack.push(bg);
      node = node.parentElement;
    }
    if (!stack.length) return { r: 255, g: 255, b: 255 };
    let base = { r: 255, g: 255, b: 255 };
    for (let i = stack.length - 1; i >= 0; i--) {
      base = blend(stack[i], base);
    }
    return base;
  }

  function resolveForeground(el: Element) {
    const style = getComputedStyle(el);
    const color = parseRgba(style.color) ?? { r: 0, g: 0, b: 0, a: 1 };
    const opacity = Number(style.opacity);
    if (Number.isFinite(opacity) && opacity >= 0 && opacity < 1) {
      color.a *= opacity;
    }
    const bg = resolveBackground(el);
    return blend(color, bg);
  }

  function isVisible(el: Element) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  return entries.map(({ selector, requiredNormal, requiredLarge }) => {
    try {
      const el = document.querySelector(selector);
      if (!el || !isVisible(el)) return { selector, pass: null as boolean | null };
      const style = getComputedStyle(el);
      const fontSizePx = parseFloat(style.fontSize) || 16;
      const weight = parseInt(style.fontWeight, 10) || 400;
      const bold = style.fontWeight === 'bold' || weight >= 700;
      const required = fontSizePx >= 24 || (fontSizePx >= 18.66 && bold) ? requiredLarge : requiredNormal;
      const fg = resolveForeground(el);
      const bg = resolveBackground(el);
      const computed = ratio(fg, bg);
      return { selector, pass: computed >= required, ratio: computed, required };
    } catch {
      return { selector, pass: null as boolean | null };
    }
  });
};

function isContrastIssue(issue: Issue): boolean {
  const group = getRuleGroup(issue);
  return group === 'color-contrast' || group === 'color-contrast-enhanced';
}

function isEnhancedContrastIssue(issue: Issue): boolean {
  return getRuleGroup(issue) === 'color-contrast-enhanced';
}

function messageSaysPass(issue: Issue): boolean {
  const parsed = parseContrastFromAxeMessage(issue.message);
  if (!parsed) return false;
  const enhanced = isEnhancedContrastIssue(issue);
  const large =
    parsed.fontSizePx != null ? isLargeText(parsed.fontSizePx, parsed.fontWeight ?? 400, false) : false;
  const required = enhanced
    ? large
      ? 4.5
      : 7
    : requiredAaContrastRatio(large);
  if (parsed.foreground && parsed.background) {
    const ratio = contrastRatio(parsed.foreground, parsed.background);
    if (ratio >= required) return true;
  }
  // Axe occasionally flags an element while reporting a passing ratio in the same message.
  if (parsed.ratio >= required) return true;
  return false;
}

export async function filterContrastFalsePositives(
  page: Page,
  issues: Issue[]
): Promise<ContrastFilterResult> {
  const targets = issues.filter((issue) => isContrastIssue(issue) && issue.selector.trim());
  if (!targets.length) return { issues, removedCount: 0 };

  const selectorEntries = [...new Map(
    targets.map((issue) => {
      const sel = issue.selector.trim();
      const enhanced = isEnhancedContrastIssue(issue);
      return [
        sel,
        {
          selector: sel,
          requiredNormal: enhanced ? 7 : 4.5,
          requiredLarge: enhanced ? 4.5 : 3,
        },
      ] as const;
    })
  ).values()];
  let browserResults: Array<{ selector: string; pass: boolean | null }> = [];
  try {
    browserResults = (await page.evaluate(BROWSER_VERIFY_FN, selectorEntries)) as Array<{
      selector: string;
      pass: boolean | null;
    }>;
  } catch {
    return { issues, removedCount: 0 };
  }

  const passBySelector = new Map<string, boolean | null>();
  for (const row of browserResults) {
    passBySelector.set(row.selector, row.pass);
  }

  let removedCount = 0;
  const kept = issues.filter((issue) => {
    if (!isContrastIssue(issue)) return true;
    if (messageSaysPass(issue)) {
      removedCount++;
      return false;
    }
    const sel = issue.selector.trim();
    if (!sel) return true;
    const pass = passBySelector.get(sel);
    if (pass === true) {
      removedCount++;
      return false;
    }
    return true;
  });

  return { issues: kept, removedCount };
}
