/**
 * Post-scan false-positive filters for axe/htmlcs findings affected by stacking contexts,
 * overlay timing, and computed-style mismatches.
 */
import type { Page } from 'puppeteer';
import { filterContrastFalsePositives } from '@/lib/scan/color-contrast-false-positive-filter';
import { filterFocusNotObscuredFalsePositives } from '@/lib/scan/focus-not-obscured-false-positive-filter';
import { filterLinkInTextBlockFalsePositives } from '@/lib/scan/link-in-text-block-false-positive-filter';
import { filterNonVisibleElementIssues } from '@/lib/scan/non-visible-element-issue-filter';
import { filterTargetSizeFalsePositives } from '@/lib/scan/target-size-false-positive-filter';
import type { Issue } from '@/lib/scan/types';

export type ScanFalsePositiveBreakdown = {
  nonVisible: number;
  contrast: number;
  linkInTextBlock: number;
  targetSize: number;
  focusNotObscured: number;
};

export type ScanFalsePositiveFilterResult = {
  issues: Issue[];
  removedCount: number;
  breakdown: ScanFalsePositiveBreakdown;
};

export async function filterScanFalsePositives(
  page: Page,
  issues: Issue[]
): Promise<ScanFalsePositiveFilterResult> {
  const nonVisible = await filterNonVisibleElementIssues(page, issues);
  const contrast = await filterContrastFalsePositives(page, nonVisible.issues);
  const linkInText = await filterLinkInTextBlockFalsePositives(page, contrast.issues);
  const targetSize = await filterTargetSizeFalsePositives(page, linkInText.issues);
  const focusNotObscured = await filterFocusNotObscuredFalsePositives(page, targetSize.issues);

  const breakdown: ScanFalsePositiveBreakdown = {
    nonVisible: nonVisible.removedCount,
    contrast: contrast.removedCount,
    linkInTextBlock: linkInText.removedCount,
    targetSize: targetSize.removedCount,
    focusNotObscured: focusNotObscured.removedCount,
  };

  return {
    issues: focusNotObscured.issues,
    removedCount:
      breakdown.nonVisible +
      breakdown.contrast +
      breakdown.linkInTextBlock +
      breakdown.targetSize +
      breakdown.focusNotObscured,
    breakdown,
  };
}
