/**
 * Drop selector-based findings on elements that are not user-visible at scan time
 * (hidden CMPs, overlays, off-screen clipped nodes, aria-hidden subtrees).
 */
import type { Page } from 'puppeteer';
import { getRuleGroup } from '@/lib/scan/issue-dedupe';
import {
  DISMISS_OVERLAY_HOST_SELECTORS,
  ELEMENT_VISIBILITY_CHECK_FN,
  FILTER_WHEN_NOT_USER_VISIBLE,
  NEVER_FILTER_INVISIBLE,
} from '@/lib/scan/element-audit-visibility';
import type { Issue } from '@/lib/scan/types';

export type NonVisibleFilterResult = {
  issues: Issue[];
  removedCount: number;
};

function shouldFilterWhenHidden(issue: Issue): boolean {
  const group = getRuleGroup(issue);
  if (NEVER_FILTER_INVISIBLE.has(group)) return false;
  if (FILTER_WHEN_NOT_USER_VISIBLE.has(group)) return true;
  return false;
}

export async function filterNonVisibleElementIssues(
  page: Page,
  issues: Issue[]
): Promise<NonVisibleFilterResult> {
  const targets = issues.filter((issue) => issue.selector.trim() && shouldFilterWhenHidden(issue));
  if (!targets.length) return { issues, removedCount: 0 };

  const selectors = [...new Set(targets.map((t) => t.selector.trim()))];
  let rows: Array<{ selector: string; visible: boolean }> = [];
  try {
    rows = (await page.evaluate(
      ELEMENT_VISIBILITY_CHECK_FN,
      selectors,
      DISMISS_OVERLAY_HOST_SELECTORS
    )) as Array<{ selector: string; visible: boolean }>;
  } catch {
    return { issues, removedCount: 0 };
  }

  const visibleBySelector = new Map(rows.map((row) => [row.selector, row.visible]));
  let removedCount = 0;
  const kept = issues.filter((issue) => {
    if (!shouldFilterWhenHidden(issue)) return true;
    const sel = issue.selector.trim();
    if (!sel) return true;
    const visible = visibleBySelector.get(sel);
    if (visible === false) {
      removedCount++;
      return false;
    }
    return true;
  });

  return { issues: kept, removedCount };
};
