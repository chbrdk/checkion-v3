/** Default max pages when `maxPages` is omitted (aligned with UI default). */
export const DOMAIN_SCAN_DEFAULT_MAX_PAGES = 1000;

/** Upper cap for maxPages (e.g. "Alle" in UI). */
export const DOMAIN_SCAN_MAX_PAGES_CAP = 10000;

/** Preset values shown in the max-pages select (cap is added separately as "All"). */
export const DOMAIN_SCAN_MAX_PAGES_PRESETS = [50, 100, 250, 500, 1000] as const;

/** Resolved page cap for a domain scan (same formula as {@link runDomainScan} in spider). */
export function resolveDomainScanMaxPages(maxPages?: number): number {
    return Math.min(DOMAIN_SCAN_MAX_PAGES_CAP, Math.max(1, maxPages ?? DOMAIN_SCAN_DEFAULT_MAX_PAGES));
}

export function buildDomainScanMaxPagesSelectOptions(
    allLabel: string
): Array<{ value: string; label: string }> {
    return [
        ...DOMAIN_SCAN_MAX_PAGES_PRESETS.map((n) => ({ value: String(n), label: String(n) })),
        { value: String(DOMAIN_SCAN_MAX_PAGES_CAP), label: allLabel },
    ];
}

/** Parse `maxPages` from URL query or form input; returns resolved cap or `undefined` when absent/invalid. */
export function parseDomainScanMaxPagesParam(
    raw: string | number | null | undefined
): number | undefined {
    if (raw == null || raw === '') return undefined;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) return undefined;
    return resolveDomainScanMaxPages(n);
}
