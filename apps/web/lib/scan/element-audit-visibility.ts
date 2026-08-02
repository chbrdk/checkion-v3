/**
 * Browser-side visibility checks for post-scan false-positive filtering.
 * Elements hidden by overlays, cookie CMPs, or stacking are not user-facing violations.
 */

/** Hosts hidden by {@link registerVisualDismissOnNewDocument} — findings inside are scan noise. */
export const DISMISS_OVERLAY_HOST_SELECTORS = [
  '#usercentrics-root',
  '.fc-consent-root',
  '#onetrust-consent-sdk',
  '#CybotCookiebotDialog',
  '#intercom-container',
  '#drift-widget',
  '#hubspot-messages-iframe-container',
  '[id*="cookie" i][role="dialog"]',
  '[class*="cookie" i][role="dialog"]',
  '[id*="consent" i][role="dialog"]',
];

/** Rule groups where a non-visible element should not count as a user-facing violation. */
export const FILTER_WHEN_NOT_USER_VISIBLE = new Set([
  'color-contrast',
  'color-contrast-enhanced',
  'link-in-text-block',
  'target-size',
  'focus-not-obscured',
  'focus-not-obscured-minimum',
  'focus-not-obscured-enhanced',
  'button-name',
  'link-name',
  'label',
  'avoid-inline-spacing',
  'nested-interactive',
  'select-name',
  'input-button-name',
]);

/** Never drop findings for page-level or intentionally hidden-tree rules. */
export const NEVER_FILTER_INVISIBLE = new Set([
  'aria-hidden-focus',
  'duplicate-id',
  'duplicate-id-aria',
  'duplicate-id-active',
  'html-has-lang',
  'html-lang-valid',
  'html-xml-lang-mismatch',
  'document-title',
  'meta-viewport',
  'meta-refresh',
  'bypass',
  'frame-title',
  'frame-title-unique',
  'video-caption',
  'audio-caption',
]);

export type ElementVisibilityRow = {
  selector: string;
  visible: boolean;
};

export const ELEMENT_VISIBILITY_CHECK_FN = function (selectors: string[], dismissHosts: string[]) {
  function parseOpacity(style: CSSStyleDeclaration) {
    const value = Number(style.opacity);
    return Number.isFinite(value) ? value : 1;
  }

  function isAriaHidden(el: Element) {
    return el.getAttribute('aria-hidden') === 'true';
  }

  function insideDismissHost(el: Element) {
    for (const hostSel of dismissHosts) {
      try {
        if (el.closest(hostSel)) return true;
      } catch {
        /* invalid selector in page context */
      }
    }
    return false;
  }

  function isUserVisible(el: Element) {
    if (insideDismissHost(el)) return false;
    if (isAriaHidden(el)) return false;

    let node: Element | null = el;
    while (node) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (parseOpacity(style) < 0.05) return false;
      if (isAriaHidden(node) && node !== el) return false;
      node = node.parentElement;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const viewH = window.innerHeight || document.documentElement.clientHeight;
    const viewW = window.innerWidth || document.documentElement.clientWidth;
    const offscreen =
      rect.bottom <= 0 || rect.right <= 0 || rect.top >= viewH || rect.left >= viewW;
    if (offscreen) {
      let clipped = true;
      node = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (style.overflow === 'visible' || style.overflowY === 'visible' || style.overflowX === 'visible') {
          clipped = false;
          break;
        }
        node = node.parentElement;
      }
      if (clipped) return false;
    }

    return true;
  }

  return selectors.map((selector) => {
    try {
      const el = document.querySelector(selector);
      if (!el) return { selector, visible: false };
      return { selector, visible: isUserVisible(el) };
    } catch {
      return { selector, visible: false };
    }
  });
};
