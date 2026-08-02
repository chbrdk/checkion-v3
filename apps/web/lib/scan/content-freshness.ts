import type {
    ContentFreshness,
    ContentFreshnessHints,
    ContentFreshnessNoteCode,
    ContentFreshnessSignalEntry,
    ContentFreshnessSource,
} from './types';

const DAY_MS = 86_400_000;
/** Flag when dated signals disagree beyond this window (notes only). */
const SOURCE_SPREAD_MS = 7 * DAY_MS;

/** Tie-break when multiple signals share the same instant (prefer modification-like sources). */
const SOURCE_PRIORITY: ContentFreshnessSource[] = [
    'http_last_modified',
    'jsonld_date_modified',
    'og_article_modified_time',
    'og_updated_time',
    'jsonld_date_published',
    'og_article_published_time',
];

function parseMs(raw: string | undefined | null): number | null {
    if (raw == null || raw === '') return null;
    const t = Date.parse(raw.trim());
    return Number.isFinite(t) ? t : null;
}

function toIso(ms: number): string {
    return new Date(ms).toISOString();
}

function pushSignal(
    out: ContentFreshnessSignalEntry[],
    source: ContentFreshnessSource,
    raw?: string | null
): void {
    if (raw == null || raw === '') return;
    const ms = parseMs(raw);
    if (ms == null) return;
    out.push({ source, valueIso: toIso(ms), raw: raw.trim() });
}

function priorityIndex(source: ContentFreshnessSource): number {
    const i = SOURCE_PRIORITY.indexOf(source);
    return i === -1 ? 999 : i;
}

function confidenceForSource(source: ContentFreshnessSource): 'high' | 'medium' | 'low' {
    switch (source) {
        case 'http_last_modified':
        case 'jsonld_date_modified':
            return 'high';
        case 'og_article_modified_time':
        case 'og_updated_time':
            return 'medium';
        default:
            return 'low';
    }
}

export interface ComputeContentFreshnessInput {
    documentCacheHints?: { etag?: string; lastModified?: string };
    mainDocumentCache?: { htmlLongCache?: boolean };
    structured?: ContentFreshnessHints | null;
    scanTimestampIso: string;
}

/**
 * Merge HTTP `Last-Modified`, JSON-LD dates, and Open Graph times into a single
 * recency view relative to the scan timestamp.
 */
export function computeContentFreshness(input: ComputeContentFreshnessInput): ContentFreshness {
    const scanMs = parseMs(input.scanTimestampIso);
    const signals: ContentFreshnessSignalEntry[] = [];

    pushSignal(signals, 'http_last_modified', input.documentCacheHints?.lastModified);
    const s = input.structured;
    if (s) {
        pushSignal(signals, 'jsonld_date_modified', s.jsonLdDateModified);
        pushSignal(signals, 'jsonld_date_published', s.jsonLdDatePublished);
        pushSignal(signals, 'og_article_modified_time', s.ogArticleModifiedTime);
        pushSignal(signals, 'og_updated_time', s.ogUpdatedTime);
        pushSignal(signals, 'og_article_published_time', s.ogArticlePublishedTime);
    }

    const notes: ContentFreshnessNoteCode[] = [];
    if (input.mainDocumentCache?.htmlLongCache) {
        notes.push('html_long_cache');
    }

    if (signals.length === 0) {
        return {
            confidence: 'unknown',
            bestAsOfIso: null,
            bestAsOfSource: null,
            ageDays: null,
            signals: [],
            ...(notes.length ? { notes } : {}),
        };
    }

    const times = signals.map((x) => ({ ms: parseMs(x.valueIso)!, sig: x }));
    const maxMs = Math.max(...times.map((t) => t.ms));
    const minMs = Math.min(...times.map((t) => t.ms));
    if (maxMs - minMs >= SOURCE_SPREAD_MS) {
        notes.push('source_spread');
    }

    const atMax = times.filter((t) => t.ms === maxMs);
    atMax.sort((a, b) => priorityIndex(a.sig.source) - priorityIndex(b.sig.source));
    const best = atMax[0]!.sig;

    let confidence = confidenceForSource(best.source);
    if (notes.includes('source_spread')) {
        if (confidence === 'high') confidence = 'medium';
        else if (confidence === 'medium') confidence = 'low';
    }

    const ageDays =
        scanMs != null ? Math.max(0, Math.round(((scanMs - maxMs) / DAY_MS) * 10) / 10) : null;

    const sortedSignals = [...signals].sort((a, b) => {
        const da = parseMs(a.valueIso) ?? 0;
        const db = parseMs(b.valueIso) ?? 0;
        if (db !== da) return db - da;
        return priorityIndex(a.source) - priorityIndex(b.source);
    });

    return {
        confidence,
        bestAsOfIso: best.valueIso,
        bestAsOfSource: best.source,
        ageDays,
        signals: sortedSignals,
        ...(notes.length ? { notes } : {}),
    };
}
