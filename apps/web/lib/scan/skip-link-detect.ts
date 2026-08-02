/**
 * Skip-link (bypass block) detection for UX scans.
 * Supports anchors with fragment hrefs and button-based skip controls (e.g. pronovabkk.de).
 */

export type SkipLinkDetectionResult = {
  hasSkipLink: boolean;
  skipLinkHref: string | null;
};

/** Label keywords (DE/EN/FR) — matched against text, aria-label, title. */
export const SKIP_LINK_TEXT_KEYWORDS = [
  'skip',
  'springen',
  'bypass',
  'hauptinhalt',
  'zum inhalt',
  'zum hauptinhalt',
  'direkt zum inhalt',
  'direkt zum hauptinhalt',
  'navigation überspringen',
  'navigation ueberspringen',
  'inhaltsverzeichnis',
  'skip to main',
  'skip to content',
  'skip navigation',
  'jump to main',
  'jump to content',
  'aller au contenu',
  'aller au contenu principal',
  'saltar al contenido',
  'vai al contenuto',
] as const;

/** Fragment / id hints for href validation on anchor skip links. */
export const SKIP_LINK_HREF_FRAGMENTS = [
  'main',
  'content',
  'inhalt',
  'hauptinhalt',
  'main-content',
  'maincontent',
  'page-content',
  'primary-content',
] as const;

/** Class name hints — only sufficient with matching skip label for generic patterns. */
export const SKIP_LINK_CLASS_HINTS = ['skip-link', 'skip_link', 'skiplink'] as const;

export const SKIP_LINK_FOCUSABLE_CLASS_HINTS = [
  'visually-hidden-focusable',
  'screen-reader-text',
  'sr-only',
  'sr-only-focusable',
] as const;

export type SkipLinkCandidateInput = {
  tagName: string;
  href: string | null;
  text: string;
  ariaLabel: string;
  title: string;
  className: string;
  role: string | null;
  mainTargetId: string | null;
};

type SkipLinkDetectionConfig = {
  textKeywords: readonly string[];
  hrefFragments: readonly string[];
  classHints: readonly string[];
  focusableClassHints: readonly string[];
};

export const SKIP_LINK_DETECTION_CONFIG: SkipLinkDetectionConfig = {
  textKeywords: SKIP_LINK_TEXT_KEYWORDS,
  hrefFragments: SKIP_LINK_HREF_FRAGMENTS,
  classHints: SKIP_LINK_CLASS_HINTS,
  focusableClassHints: SKIP_LINK_FOCUSABLE_CLASS_HINTS,
};

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function matchesSkipLinkLabel(
  combinedLabel: string,
  textKeywords: readonly string[] = SKIP_LINK_TEXT_KEYWORDS
): boolean {
  const label = normalizeLabel(combinedLabel);
  if (!label) return false;
  return textKeywords.some((kw) => label.includes(kw));
}

export function matchesSkipLinkClass(
  className: string,
  combinedLabel: string,
  classHints: readonly string[] = SKIP_LINK_CLASS_HINTS,
  focusableClassHints: readonly string[] = SKIP_LINK_FOCUSABLE_CLASS_HINTS,
  textKeywords: readonly string[] = SKIP_LINK_TEXT_KEYWORDS
): boolean {
  const cls = normalizeLabel(className);
  if (!cls) return false;
  if (classHints.some((hint) => cls.includes(hint))) return true;
  if (
    focusableClassHints.some((hint) => cls.includes(hint)) &&
    matchesSkipLinkLabel(combinedLabel, textKeywords)
  ) {
    return true;
  }
  return false;
}

export function isSkipLinkHref(
  href: string | null | undefined,
  hrefFragments: readonly string[] = SKIP_LINK_HREF_FRAGMENTS
): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed || trimmed === '#') return false;

  let fragment = '';
  if (trimmed.startsWith('#')) {
    fragment = trimmed.slice(1);
  } else {
    const hashIdx = trimmed.indexOf('#');
    if (hashIdx === -1) return false;
    fragment = trimmed.slice(hashIdx + 1);
  }

  if (!fragment) return false;
  const frag = fragment.toLowerCase();
  return hrefFragments.some((part) => frag.includes(part));
}

export function normalizeSkipLinkHref(href: string): string {
  const trimmed = href.trim();
  if (trimmed.startsWith('#')) return trimmed;
  const hashIdx = trimmed.indexOf('#');
  return hashIdx === -1 ? trimmed : trimmed.slice(hashIdx);
}

function isBackNavigationLabel(combinedLabel: string): boolean {
  const label = normalizeLabel(combinedLabel);
  return (
    label === 'zurück' ||
    label === 'back' ||
    label.startsWith('zurück ') ||
    label.startsWith('back ') ||
    label.includes(' menü schliessen') ||
    label.includes(' menu schliessen')
  );
}

/** Pure matcher used in unit tests — keep in sync with {@link getSkipLinkDetectScript}. */
export function evaluateSkipLinkCandidate(
  input: SkipLinkCandidateInput,
  config: SkipLinkDetectionConfig = SKIP_LINK_DETECTION_CONFIG
): SkipLinkDetectionResult | null {
  const text = normalizeLabel(input.text);
  const ariaLabel = normalizeLabel(input.ariaLabel);
  const title = normalizeLabel(input.title);
  const className = normalizeLabel(input.className);
  const combinedLabel = [text, ariaLabel, title, className].filter(Boolean).join(' ');

  if (isBackNavigationLabel(combinedLabel)) return null;

  const labelMatch = matchesSkipLinkLabel(combinedLabel, config.textKeywords);
  const classMatch = matchesSkipLinkClass(
    className,
    combinedLabel,
    config.classHints,
    config.focusableClassHints,
    config.textKeywords
  );
  if (!labelMatch && !classMatch) return null;

  const tag = input.tagName.toUpperCase();
  const href = input.href?.trim() ?? null;

  if (tag === 'A' && href) {
    if (isSkipLinkHref(href, config.hrefFragments)) {
      return { hasSkipLink: true, skipLinkHref: normalizeSkipLinkHref(href) };
    }
    return null;
  }

  if (tag === 'BUTTON' || input.role === 'link') {
    const mainTargetId = input.mainTargetId?.trim();
    return {
      hasSkipLink: true,
      skipLinkHref: mainTargetId ? `#${mainTargetId}` : null,
    };
  }

  return null;
}

/** Browser-context script (avoids esbuild `__name` injection in `page.evaluate`). */
export function getSkipLinkDetectScript(config: SkipLinkDetectionConfig = SKIP_LINK_DETECTION_CONFIG): string {
  const configJson = JSON.stringify(config);
  return `
(function() {
  var config = ${configJson};
  function normalize(value) {
    return (value || '').toLowerCase().replace(/\\s+/g, ' ').trim();
  }
  function matchesLabel(combinedLabel) {
    var label = normalize(combinedLabel);
    if (!label) return false;
    for (var i = 0; i < config.textKeywords.length; i++) {
      if (label.indexOf(config.textKeywords[i]) !== -1) return true;
    }
    return false;
  }
  function matchesClass(className, combinedLabel) {
    var cls = normalize(className);
    if (!cls) return false;
    for (var i = 0; i < config.classHints.length; i++) {
      if (cls.indexOf(config.classHints[i]) !== -1) return true;
    }
    for (var j = 0; j < config.focusableClassHints.length; j++) {
      if (cls.indexOf(config.focusableClassHints[j]) !== -1 && matchesLabel(combinedLabel)) return true;
    }
    return false;
  }
  function isSkipHref(href) {
    if (!href) return false;
    var trimmed = href.trim();
    if (!trimmed || trimmed === '#') return false;
    var fragment = '';
    if (trimmed.charAt(0) === '#') {
      fragment = trimmed.slice(1);
    } else {
      var hashIdx = trimmed.indexOf('#');
      if (hashIdx === -1) return false;
      fragment = trimmed.slice(hashIdx + 1);
    }
    if (!fragment) return false;
    var frag = fragment.toLowerCase();
    for (var i = 0; i < config.hrefFragments.length; i++) {
      if (frag.indexOf(config.hrefFragments[i]) !== -1) return true;
    }
    return false;
  }
  function normalizeHref(href) {
    var trimmed = href.trim();
    if (trimmed.charAt(0) === '#') return trimmed;
    var hashIdx = trimmed.indexOf('#');
    return hashIdx === -1 ? trimmed : trimmed.slice(hashIdx);
  }
  function isBackNav(combinedLabel) {
    var label = normalize(combinedLabel);
    return (
      label === 'zurück' ||
      label === 'back' ||
      label.indexOf('zurück ') === 0 ||
      label.indexOf('back ') === 0 ||
      label.indexOf(' menü schliessen') !== -1 ||
      label.indexOf(' menu schliessen') !== -1
    );
  }

  var mainEl =
    document.querySelector('main[id]') ||
    document.querySelector('[role="main"][id]') ||
    document.querySelector('#main-content, #maincontent, #main, #content, #inhalt');
  var mainTargetId = (mainEl && mainEl.id) || (document.querySelector('main, [role="main"]') ? 'main' : null);

  var elements = document.querySelectorAll('a[href], button, [role="link"]');
  for (var e = 0; e < elements.length; e++) {
    var el = elements[e];
    var text = normalize((el.textContent || '').replace(/\\s+/g, ' ').trim());
    var ariaLabel = normalize(el.getAttribute('aria-label') || '');
    var title = normalize(el.getAttribute('title') || '');
    var className = normalize(String(el.className || ''));
    var combinedLabel = [text, ariaLabel, title, className].filter(Boolean).join(' ');
    if (isBackNav(combinedLabel)) continue;

    var labelMatch = matchesLabel(combinedLabel);
    var classMatch = matchesClass(className, combinedLabel);
    if (!labelMatch && !classMatch) continue;

    var tag = el.tagName.toUpperCase();
    var href = (el.getAttribute('href') || '').trim();
    var role = el.getAttribute('role');

    if (tag === 'A' && href && isSkipHref(href)) {
      return { hasSkipLink: true, skipLinkHref: normalizeHref(href) };
    }

    if (tag === 'BUTTON' || role === 'link') {
      return { hasSkipLink: true, skipLinkHref: mainTargetId ? '#' + mainTargetId : null };
    }
  }

  return { hasSkipLink: false, skipLinkHref: null };
})();
`;
}

type EvaluatePage = {
  evaluate: <T>(fn: () => T) => Promise<T>;
};

/** Run skip-link detection in a Puppeteer page context. */
export async function detectSkipLinkOnPage(page: EvaluatePage): Promise<SkipLinkDetectionResult> {
  const script = getSkipLinkDetectScript().trim();
  return page.evaluate(new Function(`return ${script}`) as () => SkipLinkDetectionResult);
}
