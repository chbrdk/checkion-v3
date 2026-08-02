import type { Page } from 'puppeteer';
import {
  DEFAULT_HIT_TEST_OPTIONS,
  TARGET_SIZE_VERIFY_FN,
} from '@/lib/scan/element-hit-test';
import { getRuleGroup } from '@/lib/scan/issue-dedupe';
import { meetsMinTargetSize, parseTargetSizeFromMessage, WCAG_MIN_TARGET_SIZE_PX } from '@/lib/scan/wcag-target-size';
import type { Issue } from '@/lib/scan/types';

export type TargetSizeFilterResult = {
  issues: Issue[];
  removedCount: number;
};

function isTargetSizeIssue(issue: Issue): boolean {
  return getRuleGroup(issue) === 'target-size';
}

function messageSaysPass(issue: Issue): boolean {
  const parsed = parseTargetSizeFromMessage(issue.message);
  const min = parsed.minSize ?? WCAG_MIN_TARGET_SIZE_PX;
  if (parsed.width != null && parsed.height != null && meetsMinTargetSize(parsed.width, parsed.height, min)) {
    return true;
  }
  return false;
}

export async function filterTargetSizeFalsePositives(
  page: Page,
  issues: Issue[]
): Promise<TargetSizeFilterResult> {
  const targets = issues.filter((issue) => isTargetSizeIssue(issue) && issue.selector.trim());
  if (!targets.length) return { issues, removedCount: 0 };

  const selectors = [...new Set(targets.map((t) => t.selector.trim()))];
  let browserResults: Array<{ selector: string; pass: boolean | null }> = [];
  try {
    browserResults = (await page.evaluate(
      TARGET_SIZE_VERIFY_FN,
      selectors,
      DEFAULT_HIT_TEST_OPTIONS.minTargetSize,
      DEFAULT_HIT_TEST_OPTIONS.dismissHosts
    )) as Array<{ selector: string; pass: boolean | null }>;
  } catch {
    return { issues, removedCount: 0 };
  }

  const passBySelector = new Map(browserResults.map((row) => [row.selector, row.pass]));
  let removedCount = 0;
  const kept = issues.filter((issue) => {
    if (!isTargetSizeIssue(issue)) return true;
    if (messageSaysPass(issue)) {
      removedCount++;
      return false;
    }
    const pass = passBySelector.get(issue.selector.trim());
    if (pass === true) {
      removedCount++;
      return false;
    }
    return true;
  });

  return { issues: kept, removedCount };
}
