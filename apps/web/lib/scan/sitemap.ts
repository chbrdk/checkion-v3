/**
 * Sitemap discovery and URL extraction for deep (domain) scan.
 * Discovers sitemap via robots.txt or well-known URLs; parses XML to collect URLs (same site, limited).
 *
 * www / apex: `https://vkb.de` vs `https://www.vkb.de` are the same site for filtering.
 * @see knowledge/checkion-deep-scan-sitemap.md
 */

const FETCH_TIMEOUT_MS = 8000;
/** Max child sitemaps to follow when the sitemap is an index. Increased so sections like /impact are not missed. */
const MAX_SITEMAP_INDEX_CHILDREN = 25;

/**
 * Fetch with timeout (Node/Next.js).
 */
async function fetchWithTimeout(url: string): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: { Accept: 'application/xml, text/xml, */*' },
        });
        return res;
    } finally {
        clearTimeout(t);
    }
}

/** Strip leading `www.` so apex and www share one site key (scheme + registrable host). */
export function siteHostKey(hostname: string): string {
    return hostname.replace(/^www\./i, '').toLowerCase();
}

/**
 * True when `url` belongs to the same site as `origin` (scheme + host, www-insensitive).
 * Example: origin `https://vkb.de` matches `https://www.vkb.de/page`.
 */
export function isSameSiteOrigin(url: string, origin: string): boolean {
    try {
        const u = new URL(url);
        const o = new URL(origin);
        if (u.protocol !== o.protocol) return false;
        return siteHostKey(u.hostname) === siteHostKey(o.hostname);
    } catch {
        return false;
    }
}

/**
 * All Sitemap: URLs from robots.txt for the given origin (order preserved, deduped).
 * Fallback: well-known paths on the origin.
 */
export async function getSitemapUrlsFromRobots(origin: string): Promise<string[]> {
    try {
        const robotsRes = await fetchWithTimeout(`${origin}/robots.txt`);
        if (!robotsRes.ok) {
            const wellKnown = await tryWellKnownSitemaps(origin);
            return wellKnown ? [wellKnown] : [];
        }
        const text = await robotsRes.text();
        const found: string[] = [];
        const seen = new Set<string>();
        const re = /^\s*Sitemap:\s*(https?:\/\/[^\s#]+)/gim;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            const u = m[1].trim();
            if (!seen.has(u)) {
                seen.add(u);
                found.push(u);
            }
        }
        if (found.length > 0) return found;
        const wellKnown = await tryWellKnownSitemaps(origin);
        return wellKnown ? [wellKnown] : [];
    } catch {
        const wellKnown = await tryWellKnownSitemaps(origin);
        return wellKnown ? [wellKnown] : [];
    }
}

/**
 * Get first Sitemap URL from robots.txt for the given origin.
 * Fallback: try {origin}/sitemap.xml and {origin}/sitemap_index.xml.
 */
export async function getSitemapUrlFromRobots(origin: string): Promise<string | null> {
    const urls = await getSitemapUrlsFromRobots(origin);
    return urls[0] ?? null;
}

async function tryWellKnownSitemaps(origin: string): Promise<string | null> {
    for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml']) {
        try {
            const res = await fetchWithTimeout(origin + path);
            if (res.ok) return origin + path;
        } catch {
            // continue
        }
    }
    return null;
}

/**
 * Extract all <loc>...</loc> URLs from sitemap XML text.
 * Works for both <urlset> and <sitemapindex> (same tag name).
 */
function extractLocUrls(xml: string): string[] {
    const urls: string[] = [];
    const re = /<loc>\s*([^<]+)\s*<\/loc>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
        urls.push(m[1].trim());
    }
    return urls;
}

/**
 * Check if XML looks like a sitemap index (contains <sitemap>).
 */
function isSitemapIndex(xml: string): boolean {
    return /<sitemap\s/i.test(xml) || /<\/sitemap>/i.test(xml);
}

/**
 * Fetch a sitemap URL and return its XML text.
 */
async function fetchSitemapXml(url: string): Promise<string | null> {
    try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

/**
 * Fetch sitemap at sitemapUrl and collect up to maxUrls URLs from same site (www-insensitive).
 * If sitemap is an index, follow up to MAX_SITEMAP_INDEX_CHILDREN child sitemaps.
 */
export async function fetchSitemapUrls(
    sitemapUrl: string,
    origin: string,
    maxUrls: number
): Promise<string[]> {
    const collected: string[] = [];
    const seen = new Set<string>();

    function normalize(u: string): string {
        try {
            const url = new URL(u);
            return url.origin + url.pathname.replace(/\/$/, '') || url.origin + '/';
        } catch {
            return u;
        }
    }

    function sameSite(url: string): boolean {
        return isSameSiteOrigin(url, origin);
    }

    async function addFromXml(xml: string): Promise<boolean> {
        const locs = extractLocUrls(xml);
        for (const loc of locs) {
            if (collected.length >= maxUrls) return true;
            if (!sameSite(loc)) continue;
            const n = normalize(loc);
            if (seen.has(n)) continue;
            seen.add(n);
            collected.push(loc);
        }
        return collected.length >= maxUrls;
    }

    const firstXml = await fetchSitemapXml(sitemapUrl);
    if (!firstXml) return [];

    if (isSitemapIndex(firstXml)) {
        const childSitemaps = extractLocUrls(firstXml).filter(sameSite);
        const toFollow = childSitemaps.slice(0, MAX_SITEMAP_INDEX_CHILDREN);
        for (const childUrl of toFollow) {
            if (collected.length >= maxUrls) break;
            const childXml = await fetchSitemapXml(childUrl);
            if (childXml) await addFromXml(childXml);
        }
    } else {
        await addFromXml(firstXml);
    }

    return collected;
}

/**
 * Discover all robots Sitemap: entries (plus well-known fallback) and collect page URLs up to maxUrls.
 */
export async function discoverSitemapPageUrls(origin: string, maxUrls: number): Promise<string[]> {
    const sitemapRoots = await getSitemapUrlsFromRobots(origin);
    if (sitemapRoots.length === 0) return [];

    const collected: string[] = [];
    const seen = new Set<string>();

    for (const root of sitemapRoots) {
        if (collected.length >= maxUrls) break;
        const remaining = maxUrls - collected.length;
        const batch = await fetchSitemapUrls(root, origin, remaining);
        for (const u of batch) {
            const key = u.replace(/\/$/, '').toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            collected.push(u);
            if (collected.length >= maxUrls) break;
        }
    }
    return collected;
}
