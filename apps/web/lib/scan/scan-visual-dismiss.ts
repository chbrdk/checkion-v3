/**
 * Combined cookie-banner + modal/chat overlay suppression for scan screenshots and WCAG runs.
 * Always active for every scan — no per-run opt-out.
 */
import { COOKIE_BANNER_HIDE_CSS, dismissCookieBanner } from '@/lib/scan/cookie-banner-dismiss';
import {
  dismissScanOverlays,
  OVERLAY_HIDE_CSS,
} from '@/lib/scan/scan-overlay-dismiss';

export { dismissCookieBanner, dismissScanOverlays };

/** Combined early-hide CSS (cookie CMP + chat/newsletter overlays). */
export const VISUAL_DISMISS_HIDE_CSS = `${COOKIE_BANNER_HIDE_CSS}\n${OVERLAY_HIDE_CSS}`;

/** Default retry budget for late-loading CMPs and modals (all scan types). */
export const VISUAL_DISMISS_DEFAULT_OPTIONS = {
  retries: 3,
  retryDelayMs: 800,
} as const;

export type VisualDismissOptions = {
  retries?: number;
  retryDelayMs?: number;
};

type RegisterPage = {
  evaluateOnNewDocument: (fn: (hideCss: string) => void, hideCss: string) => Promise<unknown>;
};

type DismissPage = Parameters<typeof dismissCookieBanner>[0] & Parameters<typeof dismissScanOverlays>[0];

type ScanBrowser = {
  newPage: () => Promise<RegisterPage>;
  on: (
    event: 'targetcreated',
    handler: (target: { type: () => string; page: () => Promise<unknown | null> }) => void | Promise<void>
  ) => void;
};

const LATE_CMP_HOST_SELECTORS = [
  '#usercentrics-root',
  '.fc-consent-root',
  '#onetrust-consent-sdk',
  '#CybotCookiebotDialog',
  '#intercom-container',
  '#drift-widget',
  '#hubspot-messages-iframe-container',
];

/**
 * Inject combined hide CSS as early as possible (before async CMP / widget loaders run).
 * Uses a MutationObserver so late-injected hosts (e.g. Usercentrics) are hidden immediately.
 */
export async function registerVisualDismissOnNewDocument(page: RegisterPage): Promise<void> {
  const hideCss = VISUAL_DISMISS_HIDE_CSS.replace(/\s+/g, ' ').trim();
  await page.evaluateOnNewDocument((css: string) => {
    const w = window as Window & { __checkionVisualDismissWired?: boolean };
    if (w.__checkionVisualDismissWired) return;
    w.__checkionVisualDismissWired = true;

    const lateHosts = [
      '#usercentrics-root',
      '.fc-consent-root',
      '#onetrust-consent-sdk',
      '#CybotCookiebotDialog',
      '#intercom-container',
      '#drift-widget',
      '#hubspot-messages-iframe-container',
    ];

    function injectHide() {
      try {
        if (document.getElementById('checkion-visual-dismiss-hide')) return;
        const style = document.createElement('style');
        style.id = 'checkion-visual-dismiss-hide';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
      } catch {
        /* ignore */
      }
    }

    function hideLateHosts() {
      injectHide();
      try {
        for (const sel of lateHosts) {
          document.querySelectorAll(sel).forEach((el) => {
            (el as HTMLElement).style.setProperty('display', 'none', 'important');
          });
        }
      } catch {
        /* ignore */
      }
    }

    hideLateHosts();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hideLateHosts);
    }
    try {
      const obs = new MutationObserver(() => hideLateHosts());
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch {
      /* ignore */
    }
  }, hideCss);
}

/** Create a scan page with visual-dismiss hooks registered before any navigation. */
export async function createScanPage<T extends RegisterPage>(
  browser: { newPage: () => Promise<T> }
): Promise<T> {
  const page = await browser.newPage();
  await registerVisualDismissOnNewDocument(page);
  return page;
}

/**
 * Register visual dismiss on every new page target (backup for code paths that call `newPage()` directly).
 * Call once per browser instance right after `puppeteer.launch()`.
 */
export function wireVisualDismissForBrowser(browser: Pick<ScanBrowser, 'on'>): void {
  browser.on('targetcreated', async (target) => {
    if (target.type() !== 'page') return;
    try {
      const page = await target.page();
      if (!page) return;
      await registerVisualDismissOnNewDocument(page as RegisterPage);
    } catch {
      /* ignore */
    }
  });
}

function resolveDismissOptions(options?: VisualDismissOptions): Required<VisualDismissOptions> {
  return {
    retries: options?.retries ?? VISUAL_DISMISS_DEFAULT_OPTIONS.retries,
    retryDelayMs: options?.retryDelayMs ?? VISUAL_DISMISS_DEFAULT_OPTIONS.retryDelayMs,
  };
}

/** Full visual cleanup: consent banners, then modals/chat/promo overlays. */
export async function dismissVisualInterruptions(
  page: DismissPage,
  options?: VisualDismissOptions
): Promise<void> {
  const opts = resolveDismissOptions(options);
  await dismissCookieBanner(page, opts);
  await dismissScanOverlays(page, opts);
}

export { LATE_CMP_HOST_SELECTORS };
