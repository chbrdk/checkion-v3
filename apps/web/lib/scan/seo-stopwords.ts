/**
 * SEO keyword stopwords: merged Lucene-style lists (EN/DE) via `stopword`,
 * plus UI/URL/interface tokens. Used by the scanner (injected into page.evaluate)
 * and `isSeoStopword` (domain aggregation, etc.).
 */
import { deu, eng } from 'stopword';

/** Extra tokens not always in linguistic lists (nav, errors, CMS, language codes). */
const SEO_STOPWORD_EXTRAS = [
    // Sprachcodes / Kurzwörter
    'en',
    'de',
    'fr',
    'es',
    'it',
    'nl',
    'pl',
    'pt',
    'ru',
    'ja',
    'zh',
    // Interface / Fehlerseiten / URL
    'access',
    'denied',
    'don',
    'permission',
    'http',
    'https',
    'www',
    'com',
    'org',
    'net',
    'href',
    'url',
    'link',
    'click',
    'login',
    'sign',
    'cookie',
    'session',
    'error',
    'page',
    'content',
    'index',
    'home',
    'null',
    'undefined',
    'view',
    'edit',
    'search',
    'menu',
    'submit',
    'back',
    'next',
    'previous',
    'loading',
    'please',
    'wait',
    'ok',
    'cancel',
    'yes',
    'no',
    'true',
    'false',
    'default',
    'custom',
    'select',
    'optional',
    'required',
] as const;

function buildSeoStopwordSet(): Set<string> {
    const s = new Set<string>();
    for (const w of eng) s.add(w);
    for (const w of deu) s.add(w);
    for (const w of SEO_STOPWORD_EXTRAS) s.add(w);
    return s;
}

/** Merged EN + DE stopwords (lowercase) plus extras. */
export const SEO_STOPWORDS = buildSeoStopwordSet();

/** Serializable copy for Puppeteer `page.evaluate` (single source of truth). */
export const SEO_STOPWORD_LIST = Array.from(SEO_STOPWORDS);

/** Returns true if the keyword should be excluded from SEO keyword lists. */
export function isSeoStopword(keyword: string): boolean {
    const k = keyword.toLowerCase().trim();
    if (!k || k.length < 3) return true;
    if (/^\d+$/.test(k)) return true;
    return SEO_STOPWORDS.has(k);
}
