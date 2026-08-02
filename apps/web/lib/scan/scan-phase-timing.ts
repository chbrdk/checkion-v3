/**
 * Sequential phase durations for `runScan` (ms per segment, not cumulative).
 * Used with {@link ENV_CHECKION_SCAN_TIMING_LOG} for ops dashboards; optional debug log when {@link ENV_CHECKION_SCAN_DEBUG} is on.
 */
import { ENV_CHECKION_SCAN_DEBUG, ENV_CHECKION_SCAN_TIMING_LOG } from '@/lib/scan/constants';

function timingLogEnabled(): boolean {
    const v = process.env[ENV_CHECKION_SCAN_TIMING_LOG]?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

function scanDebugTimingEnabled(): boolean {
    const v = process.env[ENV_CHECKION_SCAN_DEBUG]?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

export type ScanPhaseTimingPayload = {
    type: 'checkion.scan.timing';
    scanId: string;
    device: string;
    url: string;
    /** Segment name -> milliseconds since previous mark */
    phasesMs: Record<string, number>;
    totalMs: number;
};

/**
 * Wall-clock segments between {@link mark} calls. First segment starts at construction.
 */
export function createScanPhaseTimer() {
    let last = Date.now();
    const phasesMs: Record<string, number> = {};

    return {
        mark(segment: string) {
            const now = Date.now();
            const delta = now - last;
            phasesMs[segment] = (phasesMs[segment] ?? 0) + delta;
            last = now;
        },
        /** Overwrite segment total (e.g. merge sub-steps). */
        setSegment(segment: string, ms: number) {
            phasesMs[segment] = ms;
        },
        getPhases(): Record<string, number> {
            return { ...phasesMs };
        },
        finishAndLog(payload: Omit<ScanPhaseTimingPayload, 'type' | 'phasesMs' | 'totalMs'> & { totalMs: number }): void {
            const full: ScanPhaseTimingPayload = {
                type: 'checkion.scan.timing',
                phasesMs: { ...phasesMs },
                scanId: payload.scanId,
                device: payload.device,
                url: payload.url,
                totalMs: payload.totalMs,
            };
            if (scanDebugTimingEnabled()) {
                // eslint-disable-next-line no-console
                console.log('[CHECKION scan timing]', JSON.stringify(full));
            }
            if (timingLogEnabled()) {
                // eslint-disable-next-line no-console
                console.info(JSON.stringify({ ...full, totalMs: payload.totalMs }));
            }
        },
    };
}
