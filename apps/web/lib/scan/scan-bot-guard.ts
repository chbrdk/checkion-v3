/**
 * Detect and wait for Cloudflare / WAF bot challenges during scan navigation.
 */
import type { Page } from 'puppeteer';
import { SCAN_BOT_CHALLENGE_WAIT_MS } from '@/lib/scan/constants';

export type BotChallengeKind = 'cloudflare' | 'waf' | 'captcha';

export type BotChallengeState = {
    isChallenge: boolean;
    kind: BotChallengeKind | null;
};

const CHALLENGE_PHRASES = [
    'just a moment',
    'checking your browser',
    'verify you are human',
    'attention required',
    'bot verification',
    'security check',
    'ddos protection',
    'enable javascript and cookies',
];

const CHALLENGE_SELECTORS = [
    '#challenge-form',
    '#cf-challenge-running',
    '.cf-browser-verification',
    'iframe[src*="challenges.cloudflare.com"]',
    '#turnstile-wrapper',
    '.g-recaptcha',
    '[data-cf-beacon]',
];

/** Pure detection for unit tests and browser evaluate. */
export function detectBotChallengeFromDocument(input: {
    title: string;
    bodyText: string;
    hasSelector: (selector: string) => boolean;
}): BotChallengeState {
    const title = input.title.toLowerCase();
    const body = input.bodyText.toLowerCase().slice(0, 4_000);

    for (const selector of CHALLENGE_SELECTORS) {
        if (input.hasSelector(selector)) {
            return { isChallenge: true, kind: 'cloudflare' };
        }
    }

    for (const phrase of CHALLENGE_PHRASES) {
        if (title.includes(phrase) || body.includes(phrase)) {
            return { isChallenge: true, kind: 'waf' };
        }
    }

    if (body.includes('cloudflare') && (body.includes('ray id') || body.includes('cf-ray'))) {
        return { isChallenge: true, kind: 'cloudflare' };
    }

    return { isChallenge: false, kind: null };
}

export const DETECT_BOT_CHALLENGE_FN = function () {
    return detectBotChallengeFromDocument({
        title: document.title || '',
        bodyText: document.body?.innerText || '',
        hasSelector: (selector) => !!document.querySelector(selector),
    });
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function detectBotChallenge(page: Page): Promise<BotChallengeState> {
    try {
        return (await page.evaluate(DETECT_BOT_CHALLENGE_FN)) as BotChallengeState;
    } catch {
        return { isChallenge: false, kind: null };
    }
}

/** Poll until challenge clears or timeout. Returns true when page looks like real content. */
export async function waitForBotChallengeResolution(
    page: Page,
    timeoutMs = SCAN_BOT_CHALLENGE_WAIT_MS
): Promise<boolean> {
    const started = Date.now();
    let sawChallenge = false;

    while (Date.now() - started < timeoutMs) {
        const state = await detectBotChallenge(page);
        if (!state.isChallenge) {
            return !sawChallenge || Date.now() - started > 2_000;
        }
        sawChallenge = true;
        await sleep(2_000);
    }

    return false;
}

export function parseRetryAfterMs(headers: Record<string, string | string[] | undefined>): number | undefined {
    const raw = headers['retry-after'] ?? headers['Retry-After'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(120_000, Math.floor(seconds * 1000));
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(0, Math.min(120_000, date - Date.now()));
    return undefined;
}

export function isRetryableHttpStatus(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 403;
}
