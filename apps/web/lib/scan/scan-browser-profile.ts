/**
 * Realistic browser fingerprint for Puppeteer scans (reduces WAF / Cloudflare false positives).
 */
import type { Device } from '@/lib/scan/types';
import type { Page } from 'puppeteer';

export const SCAN_BROWSER_USER_AGENTS: Record<Device, string> = {
    desktop:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    mobile:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1',
    tablet:
        'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1',
};

export const SCAN_BROWSER_ACCEPT_LANGUAGE = 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7';

/** Chromium launch args shared by all scan browsers. */
export const SCAN_PUPPETEER_LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
];

/** Headers for lightweight `fetch` during scans (HEAD / link probes). */
export function getScanFetchHeaders(): Record<string, string> {
    return {
        'User-Agent': SCAN_BROWSER_USER_AGENTS.desktop,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': SCAN_BROWSER_ACCEPT_LANGUAGE,
    };
}

const STEALTH_PATCH_FN = function () {
    try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    } catch {
        /* ignore */
    }
    try {
        const w = window as Window & { chrome?: { runtime?: Record<string, unknown> } };
        if (!w.chrome) {
            w.chrome = { runtime: {} };
        }
    } catch {
        /* ignore */
    }
    try {
        Object.defineProperty(navigator, 'languages', { get: () => ['de-DE', 'de', 'en-US', 'en'] });
    } catch {
        /* ignore */
    }
};

type StealthPage = Pick<Page, 'evaluateOnNewDocument' | 'setUserAgent' | 'setExtraHTTPHeaders'>;

/** Apply UA, headers, and anti-automation patches before the first navigation. */
export async function configureScanBrowserPage(page: StealthPage, device: Device): Promise<void> {
    await page.setUserAgent(SCAN_BROWSER_USER_AGENTS[device]);
    await page.setExtraHTTPHeaders({
        'Accept-Language': SCAN_BROWSER_ACCEPT_LANGUAGE,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    });
    await page.evaluateOnNewDocument(STEALTH_PATCH_FN);
}
