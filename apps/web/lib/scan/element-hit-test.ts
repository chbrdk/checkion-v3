/**
 * Shared hit-testing helpers for browser evaluate blocks (target-size, focus-not-obscured).
 */
import { DISMISS_OVERLAY_HOST_SELECTORS } from '@/lib/scan/element-audit-visibility';
import { WCAG_MIN_TARGET_SIZE_PX } from '@/lib/scan/wcag-target-size';

export { DISMISS_OVERLAY_HOST_SELECTORS };

export type HitTestOptions = {
  minTargetSize: number;
  dismissHosts: string[];
};

export const DEFAULT_HIT_TEST_OPTIONS: HitTestOptions = {
  minTargetSize: WCAG_MIN_TARGET_SIZE_PX,
  dismissHosts: DISMISS_OVERLAY_HOST_SELECTORS,
};

/** Serialized into page.evaluate — do not reference outer scope. */
export const TARGET_SIZE_VERIFY_FN = function (
  selectors: string[],
  minSize: number,
  dismissHosts: string[]
) {
  function insideDismissHost(el: Element | null) {
    if (!el) return false;
    for (const hostSel of dismissHosts) {
      try {
        if (el.closest(hostSel)) return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  }

  function isForeignObscurer(top: Element | null, target: Element) {
    if (!top) return false;
    if (top === target || target.contains(top)) return false;
    if (insideDismissHost(top)) return false;
    const style = getComputedStyle(top);
    if (style.pointerEvents === 'none') return false;
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) < 0.05) return false;
    return true;
  }

  function isInlineTextException(el: Element) {
    const tag = el.tagName.toLowerCase();
    if (tag !== 'a' && tag !== 'button' && el.getAttribute('role') !== 'link') return false;
    const style = getComputedStyle(el);
    if (style.display !== 'inline' && style.display !== 'inline-block') return false;
    return !!el.closest('p, li, td, th, label, span, h1, h2, h3, h4, h5, h6');
  }

  function measureBox(el: Element) {
    const rect = el.getBoundingClientRect();
    const htmlEl = el as HTMLElement;
    const width = Math.max(rect.width, htmlEl.offsetWidth || 0);
    const height = Math.max(rect.height, htmlEl.offsetHeight || 0);
    return { width, height, rect };
  }

  function largestUnobscuredRegion(el: Element, rect: DOMRect, min: number) {
    const cols = 6;
    const rows = 6;
    let bestW = 0;
    let bestH = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let spanR = 1; r + spanR <= rows; spanR++) {
          for (let spanC = 1; c + spanC <= cols; spanC++) {
            let blocked = false;
            for (let dr = 0; dr < spanR && !blocked; dr++) {
              for (let dc = 0; dc < spanC; dc++) {
                const x = rect.left + ((c + dc + 0.5) / cols) * rect.width;
                const y = rect.top + ((r + dr + 0.5) / rows) * rect.height;
                const top = document.elementFromPoint(x, y);
                if (isForeignObscurer(top, el)) {
                  blocked = true;
                  break;
                }
              }
            }
            if (!blocked) {
              const w = (spanC / cols) * rect.width;
              const h = (spanR / rows) * rect.height;
              if (w >= min && h >= min) return { width: w, height: h };
              if (w > bestW) bestW = w;
              if (h > bestH) bestH = h;
            }
          }
        }
      }
    }
    return { width: bestW, height: bestH };
  }

  return selectors.map((selector) => {
    try {
      const el = document.querySelector(selector);
      if (!el) return { selector, pass: null as boolean | null };
      if (insideDismissHost(el)) return { selector, pass: true };
      if (isInlineTextException(el)) return { selector, pass: true };

      const { width, height, rect } = measureBox(el);
      if (width >= minSize && height >= minSize) return { selector, pass: true, width, height };

      if (rect.width <= 0 || rect.height <= 0) return { selector, pass: null };

      const unobscured = largestUnobscuredRegion(el, rect, minSize);
      const pass = unobscured.width >= minSize && unobscured.height >= minSize;
      return { selector, pass, width: unobscured.width, height: unobscured.height };
    } catch {
      return { selector, pass: null as boolean | null };
    }
  });
};

export const FOCUS_NOT_OBSCURED_VERIFY_FN = function (selectors: string[], dismissHosts: string[]) {
  function insideDismissHost(el: Element | null) {
    if (!el) return false;
    for (const hostSel of dismissHosts) {
      try {
        if (el.closest(hostSel)) return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  }

  function isFocusable(el: HTMLElement) {
    if ('disabled' in el && Boolean((el as HTMLButtonElement).disabled)) return false;
    const tabIndex = el.tabIndex;
    if (tabIndex < 0) {
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'a' ||
        tag === 'button' ||
        tag === 'input' ||
        tag === 'select' ||
        tag === 'textarea' ||
        !!el.getAttribute('contenteditable')
      );
    }
    return true;
  }

  function isForeignObscurer(top: Element | null, target: Element) {
    if (!top) return true;
    if (top === target || target.contains(top)) return false;
    if (insideDismissHost(top)) return false;
    const style = getComputedStyle(top);
    if (style.pointerEvents === 'none') return false;
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (Number(style.opacity) < 0.05) return false;
    return true;
  }

  function samplePoints(rect: DOMRect) {
    const insetX = Math.min(4, rect.width * 0.15);
    const insetY = Math.min(4, rect.height * 0.15);
    return [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + insetX, rect.top + insetY],
      [rect.right - insetX, rect.top + insetY],
      [rect.left + insetX, rect.bottom - insetY],
      [rect.right - insetX, rect.bottom - insetY],
    ] as Array<[number, number]>;
  }

  return selectors.map((selector) => {
    try {
      const el = document.querySelector(selector);
      if (!el || !(el instanceof HTMLElement)) return { selector, pass: null as boolean | null };
      if (insideDismissHost(el)) return { selector, pass: true };
      if (!isFocusable(el)) return { selector, pass: null };

      el.focus({ preventScroll: true });
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { selector, pass: null };

      let unobscuredPoints = 0;
      for (const [x, y] of samplePoints(rect)) {
        const top = document.elementFromPoint(x, y);
        if (!isForeignObscurer(top, el)) unobscuredPoints++;
      }

      // WCAG 2.4.11 (Minimum): focus must not be *entirely* hidden.
      return { selector, pass: unobscuredPoints > 0 };
    } catch {
      return { selector, pass: null as boolean | null };
    }
  });
};
