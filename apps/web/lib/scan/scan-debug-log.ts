/**
 * Verbose scanner / journey logs — only when {@link ENV_CHECKION_SCAN_DEBUG} is truthy (`1`, `true`, `yes`).
 */

import { ENV_CHECKION_SCAN_DEBUG } from '@/lib/scan/constants';

function scanDebugEnabled(): boolean {
    const v = process.env[ENV_CHECKION_SCAN_DEBUG]?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

export function scanDebugLog(...args: unknown[]): void {
    if (!scanDebugEnabled()) return;
    console.log(...args);
}

export function scanDebugWarn(...args: unknown[]): void {
    if (!scanDebugEnabled()) return;
    console.warn(...args);
}
