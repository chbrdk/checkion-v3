/**
 * Dismiss non-cookie visual interruptions (chat widgets, newsletter modals, promo popups)
 * during scans. Complements {@link ./cookie-banner-dismiss.ts}.
 */

/* eslint-disable max-len */

/** CSS: hide known third-party chat / promo widgets (not main page chrome). */
export const OVERLAY_HIDE_CSS = `
  /* Chat & support widgets */
  #intercom-container,
  .intercom-lightweight-app,
  .intercom-app,
  #intercom-frame,
  #drift-widget,
  #drift-frame-chat,
  #hubspot-messages-iframe-container,
  #hubspot-conversations-iframe,
  .zEWidget-launcher,
  iframe#launcher,
  #launcher[data-testid],
  .crisp-client,
  #crisp-chatbox,
  #tawkchat-container,
  .tawk-min-container,
  #userlike,
  #uslk-right,
  .userlike-mask,
  #LeadboosterContainer,
  .brevo-conversations,
  #brevo-conversations,
  #chat-widget-container,
  #live-chat-widget,
  .livechat-widget,
  #reamaze-widget,
  .reamaze-widget,
  #smartsupp-widget-container,
  #tidio-chat,
  .tidio-chat,
  /* Newsletter / promo overlays (generic) */
  [class*="newsletter-popup" i],
  [class*="newsletter-modal" i],
  [id*="newsletter-popup" i],
  [id*="newsletter-modal" i],
  [class*="promo-popup" i],
  [class*="promo-modal" i],
  [data-testid*="newsletter-popup" i],
  [data-testid*="promo-modal" i],
  /* Generic marketing lightboxes (avoid cookie/consent — handled elsewhere) */
  [class*="lightbox" i]:not([class*="cookie" i]):not([class*="consent" i]),
  [id*="lightbox" i]:not([id*="cookie" i]):not([id*="consent" i]),
  .modal-backdrop.show,
  .overlay-backdrop,
  .popup-overlay:not([class*="cookie" i]):not([class*="consent" i]) {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
    position: fixed !important;
    z-index: -1 !important;
  }
  /* Promo dialogs (keyword in aria-label / data attributes) */
  [role="dialog"][aria-label*="newsletter" i],
  [role="dialog"][aria-label*="chat" i],
  [role="dialog"][aria-label*="promo" i],
  [role="alertdialog"][aria-label*="newsletter" i],
  [role="alertdialog"][aria-label*="chat" i] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

/** Close-button selectors for modals / flyouts (site-specific + generic). */
export const OVERLAY_CLOSE_SELECTORS = [
  '[data-testid*="close" i]',
  '[data-testid*="dismiss" i]',
  'button[aria-label*="schließen" i]',
  'button[aria-label*="close" i]',
  'button[aria-label*="dismiss" i]',
  'a[aria-label*="schließen" i]',
  'a[aria-label*="close" i]',
  '.modal-close',
  '.popup-close',
  '.dialog-close',
  '.flyout-close',
  '.close-button',
  '.btn-close',
  '.icon-close',
  'button.close',
  '[class*="modal"] button[class*="close" i]',
  '[class*="popup"] button[class*="close" i]',
  '[class*="flyout"] button[class*="close" i]',
  'button[title*="schließen" i]',
  'button[title*="close" i]',
];

/** Multilingual “close / not now” labels (normalized lowercase). */
export const OVERLAY_CLOSE_TEXTS: string[] = [
  'schließen',
  'close',
  'dismiss',
  'abbrechen',
  'cancel',
  'not now',
  'no thanks',
  'nein danke',
  'kein interesse',
  'später',
  'later',
  'maybe later',
  'vielleicht später',
  'überspringen',
  'skip',
  '×',
  'x',
  'ok',
];

export function getOverlayDismissScript(): string {
  const selectorsJson = JSON.stringify(OVERLAY_CLOSE_SELECTORS);
  const textsJson = JSON.stringify(OVERLAY_CLOSE_TEXTS);

  return `
(function() {
  try {
    var styleId = 'checkion-overlay-hide';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = ${JSON.stringify(OVERLAY_HIDE_CSS.replace(/\s+/g, ' ').trim())};
      (document.head || document.documentElement).appendChild(style);
    }
  } catch (e) {}

  var selectors = ${selectorsJson};
  var closeTexts = ${textsJson};
  function norm(t) {
    return (t || '').replace(/\\s+/g, ' ').trim().toLowerCase();
  }
  function isCookieRelated(el) {
    if (!el) return true;
    var blob = norm(
      (el.id || '') + ' ' + (el.className || '') + ' ' +
      (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('data-testid') || '')
    );
    return /cookie|consent|gdpr|privacy|usercentrics|onetrust|cookiebot/.test(blob);
  }
  function clickIfVisible(el) {
    if (!el || isCookieRelated(el)) return false;
    if (el.offsetParent === null) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    try {
      el.click();
      return true;
    } catch (err) { return false; }
  }
  for (var i = 0; i < selectors.length; i++) {
    try {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        if (clickIfVisible(nodes[j])) break;
      }
    } catch (err) {}
  }
  try {
    var buttons = document.querySelectorAll('button, a, [role="button"], [aria-label]');
    for (var k = 0; k < buttons.length; k++) {
      var b = buttons[k];
      if (isCookieRelated(b)) continue;
      var label = norm(b.innerText || b.textContent || b.getAttribute('aria-label') || b.getAttribute('title') || '');
      if (!label || label.length > 40) continue;
      for (var t = 0; t < closeTexts.length; t++) {
        if (label === closeTexts[t] || (closeTexts[t].length >= 4 && label.indexOf(closeTexts[t]) !== -1)) {
          if (clickIfVisible(b)) break;
        }
      }
    }
  } catch (err) {}
})();
`;
}

export function registerOverlayHideOnNewDocument(page: {
  evaluateOnNewDocument: (fn: (hideCss: string) => void, hideCss: string) => Promise<unknown>;
}): Promise<unknown> {
  const hideCss = OVERLAY_HIDE_CSS.replace(/\s+/g, ' ').trim();
  return page.evaluateOnNewDocument((css: string) => {
    function injectHide() {
      try {
        if (document.getElementById('checkion-overlay-hide')) return;
        const style = document.createElement('style');
        style.id = 'checkion-overlay-hide';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
      } catch {
        /* ignore */
      }
    }
    injectHide();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectHide);
    }
  }, hideCss);
}

type DismissPage = {
  addStyleTag: (opts: { content: string }) => Promise<unknown>;
  evaluate: <T>(fn: () => T) => Promise<T>;
  waitForTimeout?: (ms: number) => Promise<void>;
};

/**
 * Hide / close newsletter, chat and promo overlays. Safe to call after {@link dismissCookieBanner}.
 */
export async function dismissScanOverlays(
  page: DismissPage,
  options?: { retries?: number; retryDelayMs?: number }
): Promise<void> {
  const retries = Math.max(0, options?.retries ?? 3);
  const retryDelayMs = options?.retryDelayMs ?? 800;

  const sleep = async (ms: number) => {
    if (typeof page.waitForTimeout === 'function') {
      await page.waitForTimeout(ms);
    } else {
      await new Promise((r) => setTimeout(r, ms));
    }
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.addStyleTag({ content: OVERLAY_HIDE_CSS });
    } catch {
      /* ignore */
    }

    const script = getOverlayDismissScript();
    try {
      await page.evaluate(new Function(script) as () => void);
    } catch {
      /* ignore */
    }

    try {
      const keyboard = (page as { keyboard?: { press: (key: string) => Promise<void> } }).keyboard;
      await keyboard?.press('Escape');
    } catch {
      /* ignore */
    }

    if (attempt < retries) {
      await sleep(retryDelayMs);
    }
  }

  await sleep(300);
}
