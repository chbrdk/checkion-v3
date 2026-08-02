import type { Page } from 'puppeteer';
import { DEFAULT_HIT_TEST_OPTIONS, FOCUS_NOT_OBSCURED_VERIFY_FN } from '@/lib/scan/element-hit-test';
import { getRuleGroup } from '@/lib/scan/issue-dedupe';
import { isFocusNotObscuredRule } from '@/lib/scan/wcag-focus-not-obscured';
import type { Issue } from '@/lib/scan/types';

export type FocusNotObscuredFilterResult = {
  issues: Issue[];
  removedCount: number;
};

function isFocusObscuredIssue(issue: Issue): boolean {
  if (isFocusNotObscuredRule(issue.code)) return true;
  return isFocusNotObscuredRule(getRuleGroup(issue));
}

export async function filterFocusNotObscuredFalsePositives(
  page: Page,
  issues: Issue[]
): Promise<FocusNotObscuredFilterResult> {
  const targets = issues.filter((issue) => issue.selector.trim() && isFocusObscuredIssue(issue));
  if (!targets.length) return { issues, removedCount: 0 };

  const selectors = [...new Set(targets.map((t) => t.selector.trim()))];
  let browserResults: Array<{ selector: string; pass: boolean | null }> = [];
  try {
    browserResults = (await page.evaluate(
      FOCUS_NOT_OBSCURED_VERIFY_FN,
      selectors,
      DEFAULT_HIT_TEST_OPTIONS.dismissHosts
    )) as Array<{ selector: string; pass: boolean | null }>;
  } catch {
    return { issues, removedCount: 0 };
  }

  const passBySelector = new Map(browserResults.map((row) => [row.selector, row.pass]));
  let removedCount = 0;
  const kept = issues.filter((issue) => {
    if (!isFocusObscuredIssue(issue)) return true;
    const pass = passBySelector.get(issue.selector.trim());
    if (pass === true) {
      removedCount++;
      return false;
    }
    return true;
  });

  return { issues: kept, removedCount };
}
