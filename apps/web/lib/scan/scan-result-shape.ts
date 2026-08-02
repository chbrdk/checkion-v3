/**
 * Versioned shape for persisted `ScanResult` (single-page + domain page rows).
 * See `SCAN_RESULT_LATEST_SCHEMA_VERSION` when evolving the JSON contract.
 */
import type { Pass, ScanResult } from '@/lib/scan/types';

export const SCAN_RESULT_LATEST_SCHEMA_VERSION = 1 as const;

export type ScanResultSchemaVersion = typeof SCAN_RESULT_LATEST_SCHEMA_VERSION;

/** Legacy rows may omit this; readers treat undefined as pre-versioned. */
export function getScanResultSchemaVersion(row: ScanResult | null | undefined): number | undefined {
    return row?.scanSchemaVersion;
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}

/** Coerce stored passes (axe rule passes) to {@link Pass}[]; drops invalid entries. */
export function normalizePasses(raw: unknown): Pass[] {
    if (!Array.isArray(raw)) return [];
    const out: Pass[] = [];
    for (const item of raw) {
        if (!isRecord(item)) continue;
        const id = typeof item.id === 'string' ? item.id : '';
        const description = typeof item.description === 'string' ? item.description : '';
        const help = typeof item.help === 'string' ? item.help : '';
        const nodesRaw = item.nodes;
        if (!Array.isArray(nodesRaw)) continue;
        const nodes: Pass['nodes'] = [];
        for (const n of nodesRaw) {
            if (!isRecord(n)) continue;
            const html = typeof n.html === 'string' ? n.html : '';
            const target = Array.isArray(n.target) ? n.target.filter((t): t is string => typeof t === 'string') : [];
            const failureSummary =
                typeof n.failureSummary === 'string' ? n.failureSummary : undefined;
            nodes.push({ html, target, ...(failureSummary ? { failureSummary } : {}) });
        }
        if (id || description || nodes.length > 0) {
            out.push({ id: id || 'unknown', description, help, nodes });
        }
    }
    return out;
}

/**
 * Normalize before DB insert/update: schema version, passes array.
 * Does not strip large fields (screenshot); callers may do that separately if needed.
 */
export function normalizeScanResultForPersist(input: ScanResult): ScanResult {
    return {
        ...input,
        scanSchemaVersion: input.scanSchemaVersion ?? SCAN_RESULT_LATEST_SCHEMA_VERSION,
        passes: normalizePasses(input.passes),
    };
}

/**
 * Merge patch into stored scan result; preserves `scanSchemaVersion` unless patch sets it.
 */
export function mergeScanResultPatch(current: ScanResult, patch: Partial<ScanResult>): ScanResult {
    const merged: ScanResult = {
        ...current,
        ...patch,
        scanSchemaVersion:
            patch.scanSchemaVersion !== undefined
                ? patch.scanSchemaVersion
                : (current.scanSchemaVersion ?? SCAN_RESULT_LATEST_SCHEMA_VERSION),
        passes:
            patch.passes !== undefined ? normalizePasses(patch.passes) : normalizePasses(current.passes),
    };
    return normalizeScanResultForPersist(merged);
}
