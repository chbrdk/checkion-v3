/**
 * Build an absolute URL for domain deep-scan start/resume links (`/scan/domain?url=…`).
 * Accepts a hostname or an existing http(s) URL.
 */
export function toScanStartUrl(domainOrUrl: string): string | null {
    const t = domainOrUrl.trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t.replace(/^\/+/, '')}`;
}

/**
 * Same as {@link toScanStartUrl} but returns `''` when input is empty (form helpers).
 * Use when the user types `example.com`, `www.example.com`, or `/path` without scheme.
 */
export function ensureUrlWithScheme(raw: string): string {
    return toScanStartUrl(raw) ?? '';
}

/**
 * Normalize URL for deduplication and fingerprint lookup (same rules as domain spider).
 */
export function normalizeScanUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin + u.pathname.replace(/\/$/, '');
    } catch {
        return url;
    }
}
