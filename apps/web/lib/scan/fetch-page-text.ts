/**
 * Thin Chromium page-text fetch — no axe/Pa11y/screenshot.
 * Spec: specs/api/fetch-page.md
 */

import { paths } from '../paths'
import { shouldRunLiveScans } from './live-scan-gate'

export type FetchPageTextResult = {
  url: string
  finalUrl: string
  title: string | null
  bodyTextExcerpt: string
  httpStatus: number | null
  stubbed: boolean
}

export type FetchPageRunner = (url: string) => Promise<FetchPageTextResult>

let runnerForTests: FetchPageRunner | null = null

/** Test hook — inject a stub instead of Puppeteer. */
export function setFetchPageRunnerForTests(runner: FetchPageRunner | null): void {
  runnerForTests = runner
}

function fixtureResult(url: string): FetchPageTextResult {
  return {
    url,
    finalUrl: url,
    title: 'Fixture page',
    bodyTextExcerpt: `Fixture CHECKION fetch-page excerpt for ${url}. Enable CHECKION_LIVE_SCANS (or DATABASE_URL) for Chromium.`,
    httpStatus: 200,
    stubbed: true,
  }
}

async function fetchPageTextLive(url: string): Promise<FetchPageTextResult> {
  const { launchStandaloneScanBrowser } = await import('./scanner')
  const { createScanPage, dismissVisualInterruptions } = await import('./scan-visual-dismiss')
  const { configureScanBrowserPage } = await import('./scan-browser-profile')
  const { gotoForScan } = await import('./scan-goto')

  const browser = await launchStandaloneScanBrowser()
  try {
    const page = await createScanPage(browser)
    await page.setViewport({ width: 1280, height: 720 })
    await configureScanBrowserPage(page, 'desktop')
    const response = await gotoForScan(page, url)
    await dismissVisualInterruptions(page)
    const httpStatus = response?.status() ?? null
    const maxChars = paths.fetchPageMaxChars
    const evaluated = await page.evaluate((cap: number) => {
      const bodyText = document.body?.innerText ?? ''
      return {
        title: document.title || null,
        finalUrl: location.href,
        bodyTextExcerpt: bodyText.replace(/\s+/g, ' ').trim().slice(0, cap),
      }
    }, maxChars)
    return {
      url,
      finalUrl: evaluated.finalUrl || url,
      title: evaluated.title,
      bodyTextExcerpt: evaluated.bodyTextExcerpt,
      httpStatus,
      stubbed: false,
    }
  } finally {
    await browser.close().catch(() => undefined)
  }
}

export async function fetchPageText(url: string): Promise<FetchPageTextResult> {
  if (runnerForTests) return runnerForTests(url)
  if (!shouldRunLiveScans()) return fixtureResult(url)
  return fetchPageTextLive(url)
}
