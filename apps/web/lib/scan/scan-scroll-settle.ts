import type { Page } from 'puppeteer';

/** Scroll down/up to trigger lazy content and layout shifts before WCAG checks. */
export async function scrollPageForScanLayout(page: Page): Promise<void> {
  await page.evaluate(async function () {
    const distance = 100;
    const delay = 50;
    const totalHeight = document.body.scrollHeight;
    let currentScroll = 0;

    while (window.innerHeight + currentScroll < totalHeight) {
      window.scrollBy(0, distance);
      currentScroll += distance;
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (currentScroll > 5000) break;
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 1000));
}
