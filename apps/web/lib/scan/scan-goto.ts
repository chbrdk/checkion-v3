import type { HTTPResponse, Page } from 'puppeteer';
import {
    SCAN_NAVIGATION_MAX_RETRIES,
    SCAN_NAVIGATION_RETRY_BASE_MS,
    SCAN_NAVIGATION_TIMEOUT_MS,
} from '@/lib/scan/constants';
import {
    detectBotChallenge,
    isRetryableHttpStatus,
    parseRetryAfterMs,
    waitForBotChallengeResolution,
} from '@/lib/scan/scan-bot-guard';
import { runWithHostPoliteness } from '@/lib/scan/scan-host-politeness';
import { scanDebugLog, scanDebugWarn } from '@/lib/scan/scan-debug-log';

/** True when primary `networkidle2` navigation should fall back to `domcontentloaded`. */
export function shouldFallbackScanNavigation(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    if (error.name === 'TimeoutError') return true;
    return /timeout/i.test(error.message);
}

export type ScanNavigationBlockReason = 'rate_limit' | 'bot_challenge' | 'http_error' | 'timeout';

export class ScanNavigationError extends Error {
    readonly reason: ScanNavigationBlockReason;
    readonly status?: number;
    readonly url: string;

    constructor(message: string, reason: ScanNavigationBlockReason, url: string, status?: number) {
        super(message);
        this.name = 'ScanNavigationError';
        this.reason = reason;
        this.url = url;
        this.status = status;
    }
}

const POST_DOMCONTENTLOADED_SETTLE_MS = 1_500;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function navigateOnce(
    page: Page,
    url: string,
    timeoutMs: number,
    waitUntil: 'networkidle2' | 'domcontentloaded'
): Promise<HTTPResponse | null> {
    return page.goto(url, { waitUntil, timeout: timeoutMs });
}

async function gotoForScanInner(
    page: Page,
    url: string,
    timeoutMs: number
): Promise<HTTPResponse | null> {
    let lastResponse: HTTPResponse | null = null;

    for (let attempt = 0; attempt < SCAN_NAVIGATION_MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            const backoff = SCAN_NAVIGATION_RETRY_BASE_MS * attempt;
            scanDebugWarn('[CHECKION] scan navigation retry', { url, attempt: attempt + 1, backoffMs: backoff });
            await sleep(backoff);
        }

        try {
            lastResponse = await navigateOnce(page, url, timeoutMs, 'networkidle2');
        } catch (error) {
            if (!shouldFallbackScanNavigation(error)) throw error;
            scanDebugWarn('[CHECKION] networkidle2 navigation timed out; retrying with domcontentloaded', {
                url,
                timeoutMs,
                attempt: attempt + 1,
            });
            lastResponse = await navigateOnce(page, url, timeoutMs, 'domcontentloaded');
            await sleep(POST_DOMCONTENTLOADED_SETTLE_MS);
        }

        const challenge = await detectBotChallenge(page);
        if (challenge.isChallenge) {
            scanDebugLog('[CHECKION] bot challenge detected, waiting for resolution', {
                url,
                kind: challenge.kind,
                attempt: attempt + 1,
            });
            const resolved = await waitForBotChallengeResolution(page);
            if (!resolved) {
                if (attempt < SCAN_NAVIGATION_MAX_RETRIES - 1) {
                    await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs }).catch(() => undefined);
                    continue;
                }
                throw new ScanNavigationError(
                    'Cloudflare/WAF-Bot-Schutz blockiert den Scan — bitte später erneut versuchen oder die Seite manuell prüfen.',
                    'bot_challenge',
                    url,
                    lastResponse?.status() ?? 403
                );
            }
        }

        const status = lastResponse?.status() ?? 0;
        if (isRetryableHttpStatus(status)) {
            const retryMs =
                parseRetryAfterMs(lastResponse?.headers() ?? {}) ??
                SCAN_NAVIGATION_RETRY_BASE_MS * (attempt + 1);
            scanDebugWarn('[CHECKION] retryable HTTP status during scan navigation', {
                url,
                status,
                attempt: attempt + 1,
                retryMs,
            });
            if (attempt < SCAN_NAVIGATION_MAX_RETRIES - 1) {
                await sleep(retryMs);
                continue;
            }
            if (status === 429) {
                throw new ScanNavigationError(
                    `HTTP 429 Too Many Requests — die Zielseite limitiert unsere Scan-Anfragen (${url}).`,
                    'rate_limit',
                    url,
                    status
                );
            }
            throw new ScanNavigationError(
                `HTTP ${status} beim Laden von ${url}`,
                status === 403 ? 'bot_challenge' : 'http_error',
                url,
                status
            );
        }

        if (status >= 400) {
            throw new ScanNavigationError(
                `HTTP ${status} beim Laden von ${url}`,
                'http_error',
                url,
                status
            );
        }

        return lastResponse;
    }

    throw new ScanNavigationError(
        `Navigation zu ${url} nach ${SCAN_NAVIGATION_MAX_RETRIES} Versuchen fehlgeschlagen.`,
        'timeout',
        url
    );
}

/**
 * Navigate for scans: host politeness, retries on 429, Cloudflare/WAF wait, networkidle2 fallback.
 */
export async function gotoForScan(
    page: Page,
    url: string,
    timeoutMs = SCAN_NAVIGATION_TIMEOUT_MS
): Promise<HTTPResponse | null> {
    return runWithHostPoliteness(url, () => gotoForScanInner(page, url, timeoutMs));
}
