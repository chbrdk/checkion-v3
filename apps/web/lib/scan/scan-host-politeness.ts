/**
 * Per-host navigation spacing to avoid WAF rate limits (429) during domain scans.
 */
import { SCAN_HOST_MIN_DELAY_MS } from '@/lib/scan/constants';

const lastRequestAtByHost = new Map<string, number>();
const hostTails = new Map<string, Promise<void>>();

function hostnameFromUrl(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
        return url.toLowerCase();
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveHostMinDelayMs(): number {
    const raw = process.env.SCAN_HOST_MIN_DELAY_MS;
    const n = raw != null && raw !== '' ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 0 && n <= 60_000) return Math.floor(n);
    return SCAN_HOST_MIN_DELAY_MS;
}

/**
 * Serialize and space requests to the same host across concurrent scans in this process.
 */
export async function runWithHostPoliteness<T>(url: string, fn: () => Promise<T>): Promise<T> {
    const host = hostnameFromUrl(url);
    const prev = hostTails.get(host) ?? Promise.resolve();

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    hostTails.set(host, prev.then(() => gate));

    await prev;
    try {
        const minGap = resolveHostMinDelayMs();
        if (minGap > 0) {
            const last = lastRequestAtByHost.get(host) ?? 0;
            const wait = Math.max(0, minGap - (Date.now() - last));
            if (wait > 0) await sleep(wait);
        }
        return await fn();
    } finally {
        lastRequestAtByHost.set(host, Date.now());
        release();
    }
}

/** Test helper */
export function __resetHostPolitenessForTests(): void {
    lastRequestAtByHost.clear();
    hostTails.clear();
}
