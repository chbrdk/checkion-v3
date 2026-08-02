/* ------------------------------------------------------------------ */
/*  CHECKION – Pa11y + axe-core scanner wrapper                       */
/* ------------------------------------------------------------------ */

import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';
import {
    PUPPETEER_PROTOCOL_TIMEOUT_MS,
    SCAN_NAVIGATION_TIMEOUT_MS,
    SCAN_EARLY_THIRD_PARTY_SCRIPT_HOST_CAP,
    SCAN_GREEN_WEB_FETCH_TIMEOUT_MS,
    SCAN_SCRIPT_RESOURCE_COUNT_CAP,
} from '@/lib/scan/constants';
import { createScanPhaseTimer } from '@/lib/scan/scan-phase-timing';
import { gotoForScan } from '@/lib/scan/scan-goto';
import fs from 'fs';
import path from 'path';
import {
    createScanPage,
    dismissVisualInterruptions,
    wireVisualDismissForBrowser,
} from './scan-visual-dismiss';
import { AXE_RULE_WCAG_LEVEL } from './axe-wcag-levels';
import { getRemediationUrl } from './remediation-urls';
import { buildPageIndex } from './page-index';
import { deduplicateIssues } from './issue-dedupe';
import { filterScanFalsePositives } from './scan-issue-false-positive-filter';
import { configureScanBrowserPage, SCAN_PUPPETEER_LAUNCH_ARGS } from './scan-browser-profile';
import { scrollPageForScanLayout } from './scan-scroll-settle';
import { computeGeoDimensionsScore } from './geo-dimensions-score';
import { writeScreenshot } from './screenshot-storage';
import { detectSkipLinkOnPage } from './skip-link-detect';
import type {
    Issue,
    Pass,
    Runner,
    ScanResult,
    ScanStats,
    WcagStandard,
    Device,
    ScanOptions,
    SeoAudit,
    ScanDevicePhase,
    ContentFreshnessHints,
} from './types';
import { normalizeScanResultForPersist } from '@/lib/scan/scan-result-shape';
import { computeContentFreshness } from '@/lib/scan/content-freshness';
import { SEO_STOPWORD_LIST } from '@/lib/scan/seo-stopwords';
import { scanDebugLog, scanDebugWarn } from './scan-debug-log';
import { buildPrivacyAudit } from '@/lib/scan/privacy-scan-heuristics';
import { estimateDwellTime } from '@/lib/scan/estimate-dwell-time';
import { inferInfraStackAndTracking, mergeTrackingFromThirdPartyHosts } from '@/lib/scan/infra-detect';
import type { DomInfraHints } from '@/lib/scan/infra-detect';
import { buildConsentSignals, extractConsentModeHintsFromInline, type ConsentPageProbe } from '@/lib/scan/consent-signals-merge';

/** Puppeteer / CDP may return mixed-case header names — normalize for security audit. */
function getHeader(headers: Record<string, string>, canonicalName: string): string | undefined {
    const want = canonicalName.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === want) return v;
    }
    return undefined;
}

/**
 * Viewport definitions for supported devices.
 */
const VIEWPORTS: Record<Device, { width: number; height: number; isMobile: boolean; hasTouch: boolean }> = {
    desktop: { width: 1920, height: 1080, isMobile: false, hasTouch: false },
    tablet: { width: 768, height: 1024, isMobile: true, hasTouch: true }, // iPad Portrait
    mobile: { width: 375, height: 667, isMobile: true, hasTouch: true }, // iPhone SE
};

/** Only log geo lookup network failure once per process to avoid log spam. */
let geoNetworkWarned = false;

/**
 * Map pa11y's numeric type codes to our severity labels.
 * Pa11y uses: 1 = error, 2 = warning, 3 = notice
 */
function mapSeverity(typeCode: number | string): Issue['type'] {
    if (typeCode === 1 || typeCode === 'error') return 'error';
    if (typeCode === 2 || typeCode === 'warning') return 'warning';
    return 'notice';
}

/** Detect which runner produced an issue based on its code prefix. */
function detectRunner(code: string): Runner {
    // axe-core issues contain dashes in their IDs (e.g. "color-contrast")
    // HTML_CodeSniffer issues follow the dot-separated WCAG path format
    if (/^[a-z]/.test(code) && code.includes('-')) return 'axe';
    return 'htmlcs';
}

function computeStats(issues: Issue[]): ScanStats {
    const stats: ScanStats = { errors: 0, warnings: 0, notices: 0, total: issues.length };
    for (const issue of issues) {
        if (issue.type === 'error') stats.errors++;
        else if (issue.type === 'warning') stats.warnings++;
        else stats.notices++;
    }
    return stats;
}

/** Check if server country matches target region (e.g. DE, EU). */
function matchesTargetRegion(countryCode: string, targetRegion: string): boolean {
    const code = countryCode.toUpperCase();
    const region = targetRegion.toUpperCase().trim();
    if (code === region) return true;
    if (region === 'EU') {
        const euCodes = ['DE', 'AT', 'FR', 'IT', 'ES', 'NL', 'BE', 'PT', 'IE', 'PL', 'RO', 'CZ', 'HU', 'SE', 'DK', 'FI', 'GR', 'BG', 'HR', 'SK', 'EE', 'LV', 'LT', 'SI', 'CY', 'LU', 'MT'];
        return euCodes.includes(code);
    }
    return false;
}

/** Same origin or same domain (www vs non-www) for internal link detection */
function isInternalLink(href: string, pageOrigin: string): boolean {
    if (!href.startsWith('http')) return false;
    if (href.startsWith(pageOrigin)) return true;
    try {
        const hostHref = new URL(href).hostname.replace(/^www\./i, '');
        const hostPage = new URL(pageOrigin).hostname.replace(/^www\./i, '');
        return hostHref === hostPage;
    } catch {
        return false;
    }
}

/**
 * Detect WCAG Level from the issue code (and runner for axe).
 * HTMLCS codes usually look like "WCAG2AA.Principle1..." → level from code.
 * Axe codes are rule IDs (e.g. color-contrast) → level from AXE_RULE_WCAG_LEVEL map.
 */
function detectWcagLevel(code: string, runner: Runner): Issue['wcagLevel'] {
    if (runner === 'axe') {
        const level = AXE_RULE_WCAG_LEVEL[code];
        if (level) return level;
    }
    const upperCode = code.toUpperCase();
    if (upperCode.includes('WCAG2AAA')) return 'AAA';
    if (upperCode.includes('WCAG2AA')) return 'AA';
    if (upperCode.includes('WCAG2A')) return 'A';
    if (upperCode.includes('APCA') || upperCode.includes('COLOR-CONTRAST-ENHANCED')) return 'APCA';
    return 'Unknown';
}

/**
 * Calculate a simple accessibility score (0-100).
 * Heuristic: Start at 100. Deduct points for errors and warnings.
 * - Error: -2 points
 * - Warning: -0.5 points
 * - Notice: -0.1 points (negligible)
 * Clamped to 0.
 */
function calculateScore(counts: ScanStats): number {
    const deductions = (counts.errors * 2) + (counts.warnings * 0.5) + (counts.notices * 0.1);
    return Math.max(0, Math.round(100 - deductions));
}

const PUPPETEER_LAUNCH_RETRIES = 3;

/** One Chromium process for multi-device standalone scans; caller must `close()` after all `runScan` calls finish. */
export async function launchStandaloneScanBrowser(): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> {
    return launchPuppeteerWithRetry();
}

async function launchPuppeteerWithRetry(): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> {
    let last: unknown;
    for (let attempt = 0; attempt < PUPPETEER_LAUNCH_RETRIES; attempt++) {
        try {
            const browser = await puppeteer.launch({
                args: SCAN_PUPPETEER_LAUNCH_ARGS,
                headless: true,
                protocolTimeout: PUPPETEER_PROTOCOL_TIMEOUT_MS,
            });
            wireVisualDismissForBrowser(browser);
            return browser;
        } catch (e) {
            last = e;
            if (attempt < PUPPETEER_LAUNCH_RETRIES - 1) {
                await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
            }
        }
    }
    throw last instanceof Error ? last : new Error(String(last));
}

export async function runScan(
    options: ScanOptions & { groupId?: string; targetRegion?: string; userId?: string },
): Promise<ScanResult> {
    const {
        url,
        standard = 'WCAG2AA',
        runners = ['axe', 'htmlcs'],
        device = 'desktop',
        groupId,
        targetRegion,
        userId,
        onProgress,
        sharedBrowser,
    } = options;
    const scanId = uuidv4();

    const report = (phase: ScanDevicePhase) => onProgress?.({ phase, device });

    // Dynamic import – pa11y is CommonJS and must stay server-only
    const pa11yModule = await import('pa11y');
    type Pa11yFn = (url: string, options?: Record<string, unknown>) => Promise<{ documentTitle: string; pageUrl: string; issues: unknown[] }>;
    const pa11y = ((pa11yModule as { default?: Pa11yFn }).default ?? pa11yModule) as Pa11yFn;

    const pa11yRunners: string[] = [];
    if (runners.includes('axe')) pa11yRunners.push('axe');
    if (runners.includes('htmlcs')) pa11yRunners.push('htmlcs');

    const startTime = Date.now();
    const phaseTiming = createScanPhaseTimer();
    report('starting');

    // One browser per run, or reuse caller’s browser for multi-device standalone (avoids 3× Chromium RAM).
    const ownBrowser = !sharedBrowser;
    const browser = sharedBrowser ?? (await launchPuppeteerWithRetry());

    // Create page (visual dismiss registered before any navigation)
    const page = await createScanPage(browser);
    const viewport = VIEWPORTS[device];
    await page.setViewport(viewport);
    await configureScanBrowserPage(page, device);
    report('browser_ready');

    // Inject CLS, LCP, INP observers immediately
    await page.evaluateOnNewDocument(function () {
        (window as any).__cls_score = 0;
        (window as any).__lcp_value = 0;
        (window as any).__inp_value = null;
        new PerformanceObserver(function (entryList) {
            for (const entry of entryList.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                    (window as any).__cls_score += (entry as any).value;
                }
            }
        }).observe({ type: 'layout-shift', buffered: true });
        try {
            new PerformanceObserver(function (entryList) {
                const entries = entryList.getEntries();
                const last = entries[entries.length - 1];
                if (last) (window as any).__lcp_value = (last as any).startTime;
            }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (_) {}
        try {
            new PerformanceObserver(function (entryList) {
                for (const entry of entryList.getEntries()) {
                    const e = entry as any;
                    if (e.duration !== undefined) (window as any).__inp_value = e.duration;
                }
            }).observe({ type: 'event', buffered: true });
        } catch (_) {}
    });

    // --- Console Error Tracking ---
    const consoleLogs: Array<{ type: 'error' | 'warning', text: string, location?: string }> = [];
    page.on('console', (msg) => {
        const type = msg.type() as string;
        if (type === 'error' || type === 'warning') {
            consoleLogs.push({
                type: type as 'error' | 'warning',
                text: msg.text(),
                location: msg.location()?.url
            });
        }
    });
    page.on('pageerror', (err: any) => {
        consoleLogs.push({
            type: 'error',
            text: err.message || 'Unknown error'
        });
    });



    // --- Performance & Eco Data Collection + Mixed Content + Third-Party ---
    let totalBytes = 0;
    let serverIp: string | null = null;
    let mainHeaders: Record<string, string> = {};
    let mainRedirectCount = 0;
    let scriptTransferBytesApprox = 0;
    const mixedContentUrls: string[] = [];
    const allRequestHosts = new Set<string>();
    const earlyThirdPartyScriptHosts: string[] = [];
    const earlyHostSeen = new Set<string>();
    let scriptResourceSamples = 0;
    const pageOrigin = (() => {
        try {
            return new URL(url).origin;
        } catch {
            return '';
        }
    })();
    const pageIsHttps = pageOrigin.toLowerCase().startsWith('https://');

    await page.setRequestInterception(false);
    page.on('request', (req) => {
        if (req.resourceType() !== 'script') return;
        try {
            const ru = req.url();
            const u = new URL(ru);
            const pageHostNorm = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
            const reqHostNorm = u.hostname.replace(/^www\./i, '').toLowerCase();
            if (reqHostNorm === pageHostNorm) return;
            if (earlyHostSeen.size >= SCAN_EARLY_THIRD_PARTY_SCRIPT_HOST_CAP) return;
            if (!earlyHostSeen.has(reqHostNorm)) {
                earlyHostSeen.add(reqHostNorm);
                earlyThirdPartyScriptHosts.push(u.hostname);
            }
        } catch {
            /* ignore */
        }
    });
    page.on('response', async (response) => {
        try {
            const rUrl = response.url();
            if (pageIsHttps && rUrl.startsWith('http://')) {
                mixedContentUrls.push(rUrl);
            }
            try {
                const u = new URL(rUrl);
                allRequestHosts.add(u.hostname);
            } catch (_) {}
            const req = response.request();
            if (req.resourceType() === 'script') {
                if (scriptResourceSamples < SCAN_SCRIPT_RESOURCE_COUNT_CAP) {
                    scriptResourceSamples += 1;
                    const headers = response.headers();
                    const cl = parseInt(headers['content-length'] || '0', 10);
                    if (Number.isFinite(cl) && cl > 0) scriptTransferBytesApprox += cl;
                }
            }
            /** Final URL after redirects often differs from `url` (slash, scheme, www) — match navigation doc on main frame. */
            const isMainDocumentResponse =
                req.resourceType() === 'document' && response.frame() === page.mainFrame();
            if (isMainDocumentResponse) {
                const remoteAddress = response.remoteAddress();
                serverIp = remoteAddress.ip || null;
                try {
                    mainRedirectCount = response.request().redirectChain().length;
                } catch (_) {}
                const status = response.status();
                if (status >= 200 && status < 300) {
                    // Use headers only from the final document response (2xx), not from 301/302 redirects.
                    mainHeaders = response.headers();
                }
            }
            const headers = response.headers();
            if (headers['content-length']) {
                totalBytes += parseInt(headers['content-length'], 10);
            }
        } catch (e) {
            // Ignore
        }
    });

    phaseTiming.mark('browser_setup');

    try {
        /**
         * Navigation uses `networkidle2` (waits until ≤2 connections for ~500ms). Slow or endless SPAs may hit
         * {@link SCAN_NAVIGATION_TIMEOUT_MS}: then this throws, and WCAG/heuristic extraction is skipped for this run.
         */
        // Navigate first so we can dismiss cookie banners before pa11y runs
        report('navigate');
        await gotoForScan(page, url);
        await dismissVisualInterruptions(page);
        phaseTiming.mark('navigation');

        // Scroll first so lazy content loads; dismiss again before WCAG (reduces overlay false positives).
        report('scroll_and_layout');
        await scrollPageForScanLayout(page);
        await dismissVisualInterruptions(page);
        phaseTiming.mark('scroll_and_layout');

        report('wcag_checks');
        const results = await pa11y(url, {
            browser,
            page,
            viewport,
            standard,
            runners: pa11yRunners,
            timeout: SCAN_NAVIGATION_TIMEOUT_MS, // Align with goto; pa11y reuses the loaded page
            wait: 1_000,
            ignoreUrl: true, // Page already loaded and banner dismissed above
        } as any);
        phaseTiming.mark('wcag_checks');

        // --- Extract Performance Metrics (incl. LCP/INP from observers) ---
        const perfData = await page.evaluate(function () {
            const navHeading = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming & {
                nextHopProtocol?: string;
            };
            const paint = performance.getEntriesByName('first-contentful-paint')[0];
            const ttfb = navHeading ? (navHeading.responseStart - navHeading.requestStart) : 0;
            const domLoad = navHeading ? (navHeading.domContentLoadedEventEnd - navHeading.fetchStart) : 0;
            const windowLoad = navHeading ? (navHeading.loadEventEnd - navHeading.fetchStart) : 0;
            const fcp = paint ? paint.startTime : 0;
            const lcp = (window as any).__lcp_value != null ? Math.round((window as any).__lcp_value) : 0;
            const inp = (window as any).__inp_value != null ? Math.round((window as any).__inp_value) : null;
            const nextHopProtocol = navHeading && navHeading.nextHopProtocol ? String(navHeading.nextHopProtocol) : null;
            return {
                ttfb: Math.round(ttfb),
                fcp: Math.round(fcp),
                domLoad: Math.round(domLoad),
                windowLoad: Math.round(windowLoad),
                lcp,
                inp,
                nextHopProtocol
            };
        });

        const longTaskStats = await page.evaluate(function () {
            try {
                const entries = performance.getEntriesByType('longtask');
                let max = 0;
                for (let i = 0; i < entries.length; i++) {
                    const d = entries[i].duration;
                    if (d > max) max = d;
                }
                return { count: entries.length, maxDurationMs: Math.round(max) };
            } catch {
                return { count: 0, maxDurationMs: 0 };
            }
        });

        // --- Calculate Eco Score ---
        // Model: Sustainable Web Design
        // 0.81 kWh/GB for data transfer
        // 442g CO2/kWh global average carbon intensity
        const transferGB = totalBytes / (1024 * 1024 * 1024);
        const energyKWh = transferGB * 0.81 * 0.75; // 0.75 for first-time visit (caching factor)
        const co2Grams = energyKWh * 442;

        let ecoGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' = 'F';
        if (co2Grams < 0.095) ecoGrade = 'A+';
        else if (co2Grams < 0.186) ecoGrade = 'A';
        else if (co2Grams < 0.341) ecoGrade = 'B';
        else if (co2Grams < 0.493) ecoGrade = 'C';
        else if (co2Grams < 0.656) ecoGrade = 'D';
        else if (co2Grams < 0.850) ecoGrade = 'E';

        // 1. Capture Full Page Screenshot → save to disk, store URL in result
        report('screenshot');
        const screenshotBuffer = await page.screenshot({
            fullPage: true,
            type: 'jpeg',
            quality: 70
        }) as Buffer;
        const screenshot = await writeScreenshot(scanId, screenshotBuffer);
        phaseTiming.mark('screenshot');

        // 2. Extract Bounding Boxes for Issues
        const issuePromises = (results.issues || []).map(async (raw: any) => {
            let boundingBox;

            if (raw.selector) {
                try {
                    // Try to finding the element and get its bounding box
                    // Note: This runs in the browser context
                    const box = await page.evaluate(function (sel) {
                        const el = document.querySelector(sel);
                        if (!el) return null;
                        const rect = el.getBoundingClientRect();
                        return {
                            x: rect.x + window.scrollX,
                            y: rect.y + window.scrollY,
                            width: rect.width,
                            height: rect.height,
                        };
                    }, raw.selector);
                    if (box) boundingBox = box;
                } catch (e) {
                    // Ignore selector errors
                }
            }

            const code = raw.code || '';
            const runner = detectRunner(code);
            const helpUrl = raw.helpUrl ?? getRemediationUrl(code, runner);
            return {
                code,
                type: mapSeverity(raw.type as unknown as number | string),
                message: raw.message || '',
                context: raw.context || '',
                selector: raw.selector || '',
                runner,
                wcagLevel: detectWcagLevel(code, runner),
                helpUrl: helpUrl ?? undefined,
                boundingBox,
            };
        });

        report('issue_details');
        const rawIssues: Issue[] = await Promise.all(issuePromises);
        const filtered = await filterScanFalsePositives(page, rawIssues);
        if (filtered.removedCount > 0) {
            const { breakdown } = filtered;
            scanDebugLog(
                `Filtered ${filtered.removedCount} scan false positive(s) ` +
                    `(non-visible: ${breakdown.nonVisible}, contrast: ${breakdown.contrast}, ` +
                    `link-in-text-block: ${breakdown.linkInTextBlock}, target-size: ${breakdown.targetSize}, ` +
                    `focus-not-obscured: ${breakdown.focusNotObscured})`
            );
        }
        const issues = deduplicateIssues(filtered.issues);
        phaseTiming.mark('issues');

        // 3. Capture Passed Audits using axe-core directly
        let passes: Pass[] = [];
        try {
            scanDebugLog("Injecting axe-core...");
            // Resolve path relative to CWD (project root)
            // This is safer in Next.js serverless/webpack context than require.resolve sometimes
            const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');

            if (fs.existsSync(axePath)) {
                const axeSource = fs.readFileSync(axePath, 'utf8');
                await page.addScriptTag({ content: axeSource });
                scanDebugLog("Axe injected via content. Running axe...");
            } else {
                scanDebugWarn("Axe file not found at:", axePath);
                // Fallback to require.resolve - sometimes works local dev
                const fallbackPath = require.resolve('axe-core');
                await page.addScriptTag({ path: fallbackPath });
                scanDebugLog("Axe injected via fallback path.");
            }

            // Run axe with APCA enabled
            const axeResults = await page.evaluate(async function () {
                const g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
                const axe = (g as Record<string, unknown>)['axe'] as { configure: (o: object) => void; run: (o: object) => Promise<object> } | undefined;
                try {
                    if (typeof axe === 'undefined') return { error: 'axe is undefined in page context' };

                    axe.configure({
                        rules: [{
                            id: 'color-contrast-enhanced',
                            enabled: true
                        }]
                    });

                    return await axe.run({
                        runOnly: {
                            type: 'tag',
                            values: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'cat.apca']
                        },
                        resultTypes: ['violations', 'passes', 'inapplicable', 'incomplete']
                    });
                } catch (err: any) {
                    return { error: err.toString() };
                }
            });

            scanDebugLog("Axe run complete.");
            const axe = axeResults as { passes?: Array<{ id: string; description: string; help: string; nodes: Array<{ html: string; target: string[]; failureSummary?: string }> }>; error?: string } | null;
            if (axe && axe.passes) {
                scanDebugLog(`Found ${axe.passes.length} passed rules.`);
                passes = axe.passes.map((p) => ({
                    id: String(p.id ?? ''),
                    description: String(p.description ?? ''),
                    help: String(p.help ?? ''),
                    nodes: (p.nodes ?? []).map((n) => ({
                        html: String(n.html ?? ''),
                        target: Array.isArray(n.target) ? n.target.map(String) : [],
                        ...(n.failureSummary != null ? { failureSummary: String(n.failureSummary) } : {}),
                    })),
                }));
            } else if (axe && axe.error) {
                console.error("Axe run returned error:", axe.error);
            } else {
                scanDebugWarn("Axe results structure unexpected:", axe ? Object.keys(axe) : []);
            }
        } catch (e) {
            console.error('Failed to capture passed audits:', e);
        }

        phaseTiming.mark('axe_passes');

        // --- UX Audit Collection ---
        report('ux_and_content');

        // 1. CLS (Cumulative Layout Shift)
        // We'll trust the performance observer if it ran, or default to 0
        const clsScore = await page.evaluate(function () {
            return (window as Window & { __cls_score?: number }).__cls_score ?? 0;
        });
        scanDebugLog(`[UX] CLS Score for ${url}:`, clsScore);

        // 2. Tap Targets (Mobile Only - or general check)
        const tapIssues = await page.evaluate(function () {
            const issues: any[] = [];
            document.querySelectorAll('button, a, input, [role="button"]').forEach(function (el) {
                const rect = el.getBoundingClientRect();
                // Ignore hidden or tiny elements
                if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(el).display === 'none') return;

                // 44px standard (iOS)
                if (rect.width < 44 || rect.height < 44) {
                    // Generate a simple selector
                    let selector = el.tagName.toLowerCase();
                    if (el.id) selector += `#${el.id}`;
                    else if (el.className) selector += `.${el.className.split(' ')[0]}`;

                    issues.push({
                        selector,
                        text: (el.textContent || '').slice(0, 50).trim(),
                        size: { width: Math.round(rect.width), height: Math.round(rect.height) }
                    });
                }
            });
            return issues;
        });

        // 3. Readability Analysis
        // Wait for body to be populated (Hydration check)
        try {
            await page.waitForFunction(() => document.body.innerText.length > 50, { timeout: 2000 });
        } catch (e) {
            // Ignore timeout, proceed with what we have
        }

        // Extract text content and calculate Flesch-Kincaid
        const textContent = await page.evaluate(`
            (function() {
                function isVisible(elem) {
                    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
                }
                return document.body.innerText || '';
            })()
        ` as any);

        const cleanText = textContent.replace(/\s+/g, ' ').trim();
        const sentences = cleanText.split(/[.!?]+/).length;
        const words = cleanText.split(/\s+/).length;
        const syllables = cleanText.split(/[aeiouy]+/).length; // Very rough approximation

        // Flesch-Kincaid Grade Level Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
        // Clamp values to sane defaults to avoid Infinity
        const s_w = sentences > 0 ? (words / sentences) : 0;
        const syl_w = words > 0 ? (syllables / words) : 0;
        let gradeLevel = 0.39 * s_w + 11.8 * syl_w - 15.59;
        if (isNaN(gradeLevel) || gradeLevel < 0) gradeLevel = 0;

        let readabilityGrade = 'Unknown';
        if (gradeLevel <= 6) readabilityGrade = 'Easy (6th Grade)';
        else if (gradeLevel <= 10) readabilityGrade = 'Standard (High School)';
        else if (gradeLevel <= 14) readabilityGrade = 'Complex (College)';
        else readabilityGrade = 'Very Complex (Academic)';

        // Return structured object matching UxResult interface
        const readabilityResult = {
            grade: readabilityGrade,
            score: Number(gradeLevel.toFixed(1))
        };

        // 4. Viewport Check
        const viewportCheck = await page.evaluate(function () {
            const meta = document.querySelector('meta[name="viewport"]');
            if (!meta) return { isMobileFriendly: false, issues: ['No viewport meta tag found'] };
            const content = meta.getAttribute('content') || '';
            const issues: string[] = [];
            if (content.includes('user-scalable=no') || content.includes('maximum-scale')) {
                issues.push('Zooming is disabled (user-scalable=no)');
            }
            if (!content.includes('width=device-width')) {
                issues.push('Width not set to device-width');
            }
            return { isMobileFriendly: issues.length === 0, issues };
        });

        // 5. Advanced Link Audit (Broken Links + Stats + missing rel=noopener + vague link texts)
        const vaguePhrases = ['hier klicken', 'mehr', 'read more', 'weiter', 'link', 'click here', 'mehr erfahren', 'more', 'here', 'weiterlesen', 'lesen sie mehr', 'weiterlesen', 'mehr lesen', 'mehr erfahren', 'zum artikel', 'hier', 'klicken sie hier', 'read more'];
        const allLinksResult = await page.evaluate(function (phrases) {
            const base = document.location.href;
            const links = Array.from(document.querySelectorAll('a[href]')).map(function (a) {
                var hrefAttr = a.getAttribute('href');
                var href = hrefAttr ? (function() { try { return new URL(hrefAttr, base).href; } catch (_) { return hrefAttr; } }()) : '';
                return {
                    href: href,
                    text: (a.textContent || '').slice(0, 50).trim(),
                    target: a.getAttribute('target') || '',
                    rel: (a.getAttribute('rel') || '').toLowerCase()
                };
            });
            const vagueLinkTexts: Array<{ href: string; text: string }> = [];
            links.forEach(function (l) {
                const t = l.text.toLowerCase().trim();
                if (!t || t.length < 4) {
                    if (l.href && (t === 'mehr' || t === 'more' || t === 'link' || t === 'hier' || t === 'here')) vagueLinkTexts.push({ href: l.href, text: l.text });
                    return;
                }
                if (phrases.some(function (p) { return t === p || t === p + '.'; })) vagueLinkTexts.push({ href: l.href, text: l.text });
            });
            return { links, vagueLinkTexts };
        }, vaguePhrases);
        const allLinks = allLinksResult.links;

        const origin = new URL(url).origin;
        const uniqueLinksMap = new Map<string, { href: string; text: string; target: string; rel: string }>();
        allLinks.forEach((l: { href: string; text: string; target: string; rel: string }) => {
            if (l.href.startsWith('http')) uniqueLinksMap.set(l.href, l);
        });
        const uniqueLinksList = Array.from(uniqueLinksMap.values());

        // External links with target="_blank" but missing rel="noopener" or "noreferrer"
        const missingNoopenerList = uniqueLinksList.filter(l => {
            if (!l.href.startsWith('http') || isInternalLink(l.href, origin)) return false;
            if ((l.target || '').toLowerCase() !== '_blank') return false;
            const rel = (l.rel || '').toLowerCase();
            return !rel.includes('noopener') && !rel.includes('noreferrer');
        }).map(l => ({ url: l.href, text: l.text }));

        const internalLinksCount = uniqueLinksList.filter(l => isInternalLink(l.href, new URL(url).origin)).length;
        const externalLinksCount = uniqueLinksList.length - internalLinksCount;

        // Check status of up to 25 links (prioritizing internal)
        const originForLinks = new URL(url).origin;
        const linksToCheck = uniqueLinksList.sort((a, b) => {
            const aInt = isInternalLink(a.href, originForLinks);
            const bInt = isInternalLink(b.href, originForLinks);
            return (aInt === bInt) ? 0 : aInt ? -1 : 1;
        }).slice(0, 25);

        const brokenLinkResults: Array<{ url: string; text: string; statusCode: number; message?: string; internal: boolean }> = [];

        await Promise.all(linksToCheck.map(async (link) => {
            try {
                const res = await fetch(link.href, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
                if (res.status >= 400) {
                    brokenLinkResults.push({
                        url: link.href,
                        text: link.text,
                        statusCode: res.status,
                        message: res.statusText,
                        internal: isInternalLink(link.href, new URL(url).origin)
                    });
                }
            } catch (e: any) {
                // Treat fetch errors as broken (or timeout)
                brokenLinkResults.push({
                    url: link.href,
                    text: link.text,
                    statusCode: 0,
                    message: e.message || 'Network Error/Timeout',
                    internal: isInternalLink(link.href, new URL(url).origin)
                });
            }
        }));

        const pdfLinksList = uniqueLinksList
            .filter(l => /\.pdf$/i.test(l.href))
            .map(l => ({ url: l.href, text: l.text }));

        const linkAudit = {
            broken: brokenLinkResults,
            total: uniqueLinksList.length,
            internal: internalLinksCount,
            external: externalLinksCount,
            missingNoopener: missingNoopenerList,
            pdfLinks: pdfLinksList.length > 0 ? pdfLinksList : undefined
        };

        // 5b. SEO Meta Extraction (Enhanced with Languages & Privacy)
        const seoAndMeta = await page.evaluate(function (stopList: string[]) {
            const stopWords = new Set(stopList);
            const getMeta = (name: string) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || null;
            const getOg = (prop: string) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || null;

            // Language Detection
            const htmlLang = document.documentElement.getAttribute('lang') || null;
            const hreflangs = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(el => ({
                lang: el.getAttribute('hreflang') || '',
                href: el.getAttribute('href') || ''
            }));

            const anchorList = Array.from(document.querySelectorAll('a[href]')).map(function (a) {
                const href = (a.getAttribute('href') || '').trim();
                const textRaw = (a.textContent || '').trim();
                return { textLower: textRaw.toLowerCase(), textRaw: textRaw, href: href };
            });
            const links = anchorList.map(function (a) {
                return { text: a.textLower, href: a.href };
            });
            const privacyLinkRows = anchorList.map(function (a) {
                return { text: a.textRaw, href: a.href };
            });

            // E-E-A-T page signals (for domain-scan aggregation)
            const bodyLower = document.body.innerText.toLowerCase();
            const hasCookieBannerHeuristic =
                /cookie|cookies|einwilligung|consent|tracking|zustimmung|zwecke|privatsphäre|preference/i.test(
                    bodyLower
                ) ||
                !!document.querySelector(
                    '[id*="cookie" i], [class*="cookie" i], [class*="consent" i], [class*="Cookiebot" i], [id*="CybotCookiebotDialog"], #usercentrics-root, .fc-consent-root, #onetrust-consent-sdk, [aria-label*="cookie" i], [data-testid*="cookie"], #cookie-banner, .cookie-banner, #consent-manager, .consent-banner'
                );

            const hasImpressum = links.some(function(l) { return /impressum|imprint|legal notice/i.test(l.text) || (l.href && /impressum|imprint/i.test(l.href)); });
            const hasContact = links.some(function(l) { return /kontakt|contact|get in touch/i.test(l.text) || (l.href && /contact|kontakt/i.test(l.href)); });
            const hasAboutLink = links.some(function(l) { return /über uns|about us|about we|who we|ueber uns/i.test(l.text) || (l.href && /about|ueber-uns|about-us/i.test(l.href)); });
            const hasTeamLink = links.some(function(l) { return /team|unser team|our team/i.test(l.text) || (l.href && /team/i.test(l.href)); });
            const hasCaseStudyMention = /case study|fallstudie|erfahrungsbericht|success story/i.test(bodyLower);

            // --- GEO Metrics (Generative Engine Optimization) ---
            const RECOMMENDED_TYPES = ['Article', 'FAQPage', 'HowTo', 'Organization', 'Person', 'WebPage', 'NewsArticle', 'WebSite'];
            const schemaParseErrors: string[] = [];
            const schemaTypeList: (string | string[] | null)[] = [];
            let articleHasDatePublished = false;
            let articleHasDateModified = false;
            let articleHasAuthor = false;

            function checkArticleFields(obj: any) {
                if (!obj || typeof obj !== 'object') return;
                const type = obj['@type'];
                const types = Array.isArray(type) ? type : (type ? [type] : []);
                if (!types.some((t: string) => t === 'Article' || t === 'NewsArticle')) return;
                if (obj.datePublished) articleHasDatePublished = true;
                if (obj.dateModified) articleHasDateModified = true;
                if (obj.author) articleHasAuthor = true;
                if (obj['@graph']) obj['@graph'].forEach(checkArticleFields);
            }

            document.querySelectorAll('script[type="application/ld+json"]').forEach((el, idx) => {
                try {
                    const json = JSON.parse(el.textContent || '{}');
                    const type = json['@type'];
                    if (Array.isArray(type)) schemaTypeList.push(...type);
                    else schemaTypeList.push(type || null);
                    checkArticleFields(json);
                } catch (e) {
                    const msg = (e instanceof Error ? e.message : String(e));
                    schemaParseErrors.push('Script #' + (idx + 1) + ': ' + msg);
                }
            });
            const schemaTypes = schemaTypeList.filter(Boolean).flatMap(function(x) { return Array.isArray(x) ? x : [x]; }).filter(function(x) { return typeof x === 'string'; });
            const recommendedFound = RECOMMENDED_TYPES.filter(function(t) { return schemaTypes.indexOf(t) !== -1; });
            const missingRecommended = RECOMMENDED_TYPES.filter(function(t) { return schemaTypes.indexOf(t) === -1; });

            const metaRobotsContent = getMeta('robots') || getMeta('googlebot') || null;
            const metaRobotsIndexable = !metaRobotsContent || metaRobotsContent.toLowerCase().indexOf('noindex') === -1;

            const tables = document.querySelectorAll('table').length;
            const lists = document.querySelectorAll('ul, ol').length;
            const faqSegments = document.querySelectorAll('[itemprop="mainEntity"][itemtype*="Question"], .faq-question, .faq-item, details summary').length;

            const bodyText = document.body.innerText;
            const bodyWordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
            const skinnyContent = bodyWordCount < 300;
            const citations = (bodyText.match(/\[\d+\]|source:|quelle:|statist\w+|%/gi) || []).length;
            const hasAuthorBio = !!document.querySelector('.author-bio, [itemprop="author"], .byline, .author-info') || bodyText.toLowerCase().includes('about the author');
            const citationContainers = document.querySelectorAll('blockquote, figure, [itemprop="citation"]');
            let citationsWithLinks = 0;
            citationContainers.forEach(function(el) {
                if (el.querySelector('a[href^="http"]')) citationsWithLinks++;
            });

            const titleStr = document.title || '';
            const metaDesc = getMeta('description') || '';
            const h1Str = document.querySelector('h1')?.textContent?.trim() || '';
            const duplicateContentWarning = titleStr.length > 10 && metaDesc.length > 10 &&
                (titleStr.indexOf(metaDesc.slice(0, 30)) !== -1 || metaDesc.indexOf(titleStr.slice(0, 30)) !== -1);

            const rawWords = bodyText
                .toLowerCase()
                .replace(/[^a-zäöüß\s]/g, ' ')
                .split(/\s+/)
                .filter(function (w) {
                    return w.length >= 3 && !/^\d+$/.test(w);
                });
            const wordFreq: Record<string, number> = {};
            rawWords.forEach(function(w) {
                if (!stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
            });
            const sortedWords = Object.keys(wordFreq).sort(function(a, b) { return (wordFreq[b] || 0) - (wordFreq[a] || 0); }).slice(0, 15);
            const totalWords = bodyWordCount || 1;
            const topKeywords = sortedWords.map(function(word) {
                const count = wordFreq[word] || 0;
                return { keyword: word, count: count, densityPercent: Math.round((count / totalWords) * 10000) / 100 };
            });
            const keywordPresence = topKeywords.map(function(k) {
                const kw = k.keyword;
                const t = titleStr.toLowerCase();
                const h = h1Str.toLowerCase();
                const m = metaDesc.toLowerCase();
                return { keyword: kw, inTitle: t.indexOf(kw) !== -1, inH1: h.indexOf(kw) !== -1, inMetaDescription: m.indexOf(kw) !== -1 };
            });
            const metaKeywordsRaw = getMeta('keywords') || null;
            const keywordAnalysis = topKeywords.length > 0 ? {
                totalWords: totalWords,
                topKeywords: topKeywords,
                keywordPresence: keywordPresence,
                metaKeywordsRaw: metaKeywordsRaw
            } : undefined;

            const requiredByType: Record<string, string[]> = {
                Article: ['headline', 'datePublished'],
                NewsArticle: ['headline', 'datePublished'],
                FAQPage: ['mainEntity'],
                Organization: ['name'],
                WebSite: ['name'],
                HowTo: ['name', 'step']
            };
            const structuredDataRequiredFields: Array<{ type: string; missing: string[] }> = [];
            document.querySelectorAll('script[type="application/ld+json"]').forEach(function(el) {
                try {
                    const json = JSON.parse(el.textContent || '{}');
                    const type = json['@type'];
                    const types = Array.isArray(type) ? type : (type ? [type] : []);
                    types.forEach(function(t) {
                        const required = requiredByType[t];
                        if (!required) return;
                        const missing = required.filter(function(r) { return !json[r] && (!json['@graph'] || !json['@graph'].some(function(g: Record<string, unknown>) { return g[r]; })); });
                        if (missing.length) structuredDataRequiredFields.push({ type: t, missing: missing });
                    });
                } catch (_) {}
            });

            const jsonLdRichResultGaps: Array<{ schemaType: string; missing: string[] }> = [];
            function inspectJsonLdRich(o: Record<string, unknown>, depth: number) {
                if (!o || typeof o !== 'object' || depth > 8) return;
                const g = o['@graph'];
                if (Array.isArray(g)) {
                    g.forEach(function (node) {
                        inspectJsonLdRich(node as Record<string, unknown>, depth + 1);
                    });
                }
                const type = o['@type'];
                const types = Array.isArray(type) ? type : (type ? [type] : []);
                types.forEach(function (ty) {
                    if (ty === 'VideoObject') {
                        const miss: string[] = [];
                        if (!o['name'] && !o['headline']) miss.push('name');
                        if (!o['thumbnailUrl'] && !o['image']) miss.push('thumbnailUrl|image');
                        if (miss.length) jsonLdRichResultGaps.push({ schemaType: 'VideoObject', missing: miss });
                    }
                    if (ty === 'Product') {
                        const miss: string[] = [];
                        if (!o['name']) miss.push('name');
                        if (!o['image']) miss.push('image');
                        if (!o['offers'] && !o['aggregateRating']) miss.push('offers');
                        if (miss.length) jsonLdRichResultGaps.push({ schemaType: 'Product', missing: miss });
                    }
                });
            }
            document.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
                try {
                    const json = JSON.parse(el.textContent || '{}') as Record<string, unknown>;
                    inspectJsonLdRich(json, 0);
                } catch (_) {}
            });

            let hasFaqPageSchema = false;
            let faqMainEntityCount = 0;
            let hasHowToSchema = false;
            let howToStepCount = 0;
            let hasBreadcrumbList = false;
            let organizationOrWebSiteWithTrust = false;
            let hasSameAsOrLogo = false;
            function walkGeoSchema(o: Record<string, unknown>, depth: number) {
                if (!o || typeof o !== 'object' || depth > 10) return;
                if (Array.isArray(o)) {
                    for (let i = 0; i < o.length; i++) walkGeoSchema(o[i] as Record<string, unknown>, depth + 1);
                    return;
                }
                const g = o['@graph'];
                if (Array.isArray(g)) {
                    for (let j = 0; j < g.length; j++) walkGeoSchema(g[j] as Record<string, unknown>, depth + 1);
                }
                const type = o['@type'];
                const types = Array.isArray(type) ? type : (type ? [type] : []);
                for (let k = 0; k < types.length; k++) {
                    var ty = types[k] as string;
                    if (ty === 'FAQPage') {
                        hasFaqPageSchema = true;
                        var me = o['mainEntity'];
                        if (Array.isArray(me)) faqMainEntityCount += me.length;
                        else if (me) faqMainEntityCount += 1;
                    }
                    if (ty === 'HowTo') {
                        hasHowToSchema = true;
                        var st = o['step'];
                        if (Array.isArray(st)) howToStepCount += st.length;
                        else if (st) howToStepCount += 1;
                    }
                    if (ty === 'BreadcrumbList') hasBreadcrumbList = true;
                    if (ty === 'Organization' || ty === 'WebSite') {
                        organizationOrWebSiteWithTrust = true;
                        if (o['sameAs'] || o['logo']) hasSameAsOrLogo = true;
                    }
                }
            }
            document.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
                try {
                    const json = JSON.parse(el.textContent || '{}') as Record<string, unknown>;
                    walkGeoSchema(json, 0);
                } catch (_) {}
            });

            const h1CountForGeo = document.querySelectorAll('h1').length;
            const hasSingleH1Geo = h1CountForGeo === 1;
            const headingH2Count = document.querySelectorAll('h2').length;
            const headingH3Count = document.querySelectorAll('h3').length;
            const definitionListPairCount = document.querySelectorAll('dl dt').length;
            var mainContentWordRatio: number | undefined = undefined;
            const mainElGeo = document.querySelector('main');
            if (mainElGeo && bodyWordCount > 0) {
                var mainTextGeo = mainElGeo.innerText || '';
                var mainWordsGeo = mainTextGeo.trim().split(/\s+/).filter(Boolean).length;
                mainContentWordRatio = mainWordsGeo / bodyWordCount;
            }

            const preloadLinks = Array.from(document.querySelectorAll('link[rel="preload"]')).map(function(l) { return l.getAttribute('href') || ''; }).filter(Boolean);
            const preconnectLinks = Array.from(document.querySelectorAll('link[rel="preconnect"]')).map(function(l) { return l.getAttribute('href') || ''; }).filter(Boolean);
            const sriMissing: { tag: string; url: string }[] = [];
            const pageOrigin = window.location.origin;
            document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach(function(el) {
                const src = el.getAttribute('src') || el.getAttribute('href') || '';
                if (!src || src.startsWith(pageOrigin) || src.startsWith('data:') || src.startsWith('blob:')) return;
                if (!el.getAttribute('integrity')) sriMissing.push({ tag: el.tagName, url: src });
            });
            let reducedMotionInCss = false;
            let withoutFontDisplay = 0;
            let fontDisplayBlockCount = 0;
            try {
                for (let i = 0; i < document.styleSheets.length; i++) {
                    const sheet = document.styleSheets[i];
                    try {
                        const rules = sheet.cssRules || sheet.rules;
                        for (let j = 0; j < (rules?.length || 0); j++) {
                            const r = rules[j];
                            const cssText = r && r.cssText ? r.cssText : '';
                            if (r && cssText.indexOf('prefers-reduced-motion') !== -1) reducedMotionInCss = true;
                            if (r && r.type === 5) {
                                if (cssText.indexOf('font-display') === -1) withoutFontDisplay++;
                                else if (/font-display:\s*block\b/.test(cssText)) fontDisplayBlockCount++;
                            }
                        }
                    } catch (_) {}
                }
            } catch (_) {}
            const metaRefreshPresent = !!(document.querySelector('meta[http-equiv="refresh"]') || document.querySelector('meta[http-equiv="Refresh"]'));
            let focusVisibleFailCount = 0;
            const focusable = document.querySelectorAll('a[href], button, input, textarea, select, [tabindex="0"]');
            focusable.forEach(function(el) {
                const style = window.getComputedStyle(el, ':focus');
                const outline = style.outlineWidth || style.outline;
                const boxShadow = style.boxShadow;
                if ((!outline || outline === '0px' || outline === 'none') && (!boxShadow || boxShadow === 'none')) focusVisibleFailCount++;
            });
            const videos = document.querySelectorAll('video');
            const audios = document.querySelectorAll('audio');
            let videosWithoutCaptions = 0;
            let audiosWithoutTranscript = 0;
            videos.forEach(function(v) {
                const hasTrack = v.querySelectorAll('track[kind="captions"], track[kind="subtitles"]').length > 0;
                if (!hasTrack) videosWithoutCaptions++;
            });
            audios.forEach(function(a) {
                const parent = a.parentElement;
                const hasTranscript = parent && (parent.querySelector('a[href*="transcript"], a[download], [class*="transcript"]') || (parent.innerText || '').length > 100);
                if (!hasTranscript) audiosWithoutTranscript++;
            });
            const manifestLink = document.querySelector('link[rel="manifest"]');
            const themeColor = getMeta('theme-color') || null;
            const appleTouch = document.querySelector('link[rel="apple-touch-icon"]');
            const appleTouchIcon = appleTouch ? (appleTouch.getAttribute('href') || null) : null;

            const bodyTextExcerpt = bodyText.replace(/\s+/g, ' ').trim().slice(0, 6000);
            return {
                bodyTextExcerpt: bodyTextExcerpt || undefined,
                seo: {
                    title: document.title || null,
                    metaDescription: getMeta('description'),
                    h1: document.querySelector('h1')?.textContent?.trim() || null,
                    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
                    ogTitle: getOg('og:title'),
                    ogDescription: getOg('og:description'),
                    ogImage: getOg('og:image'),
                    twitterCard: getMeta('twitter:card'),
                    duplicateContentWarning: duplicateContentWarning,
                    skinnyContent: skinnyContent,
                    bodyWordCount: bodyWordCount,
                    structuredDataRequiredFields: structuredDataRequiredFields.length > 0 ? structuredDataRequiredFields : undefined,
                    keywordAnalysis: keywordAnalysis,
                    jsonLdRichResultGaps: jsonLdRichResultGaps.length > 0 ? jsonLdRichResultGaps.slice(0, 25) : undefined
                },
                geo: {
                    htmlLang,
                    hreflangs
                },
                privacyLinkRows: privacyLinkRows,
                cookieBannerHeuristic: hasCookieBannerHeuristic,
                eeatPage: {
                    hasImpressum,
                    hasContact,
                    hasAboutLink,
                    hasTeamLink,
                    hasCaseStudyMention
                },
                generative: {
                    schemaCoverage: [...new Set(schemaTypes)],
                    schemaParseErrors: schemaParseErrors.length > 0 ? schemaParseErrors : undefined,
                    recommendedSchemaTypesFound: recommendedFound,
                    missingRecommendedSchemaTypes: missingRecommended,
                    articleSchemaQuality: {
                        hasDatePublished: articleHasDatePublished,
                        hasDateModified: articleHasDateModified,
                        hasAuthor: articleHasAuthor
                    },
                    metaRobotsContent: metaRobotsContent,
                    metaRobotsIndexable: metaRobotsIndexable,
                    tableCount: tables,
                    listCount: lists,
                    faqCount: faqSegments,
                    citationCount: citations,
                    citationsWithLinks: citationsWithLinks,
                    hasAuthorBio: hasAuthorBio,
                    listDensity: Number((lists / (document.querySelectorAll('div, section, article').length || 1)).toFixed(2)),
                    hasFaqPageSchema: hasFaqPageSchema,
                    hasHowToSchema: hasHowToSchema,
                    faqMainEntityCount: faqMainEntityCount,
                    howToStepCount: howToStepCount,
                    hasBreadcrumbList: hasBreadcrumbList,
                    organizationOrWebSiteWithTrust: organizationOrWebSiteWithTrust,
                    hasSameAsOrLogo: hasSameAsOrLogo,
                    headingH2Count: headingH2Count,
                    headingH3Count: headingH3Count,
                    hasSingleH1: hasSingleH1Geo,
                    mainContentWordRatio: mainContentWordRatio,
                    definitionListPairCount: definitionListPairCount
                },
                extended: {
                    resourceHints: { preload: preloadLinks, preconnect: preconnectLinks },
                    sriMissing: sriMissing,
                    reducedMotionInCss: reducedMotionInCss,
                    focusVisibleFailCount: focusVisibleFailCount,
                    mediaAccessibility: { videosWithoutCaptions: videosWithoutCaptions, audiosWithoutTranscript: audiosWithoutTranscript },
                    manifest: { present: !!manifestLink, url: (manifestLink && manifestLink.getAttribute('href')) || undefined },
                    themeColor: themeColor,
                    appleTouchIcon: appleTouchIcon,
                    metaRefreshPresent: metaRefreshPresent,
                    fontDisplayIssues: (withoutFontDisplay > 0 || fontDisplayBlockCount > 0) ? { withoutFontDisplay: withoutFontDisplay, blockCount: fontDisplayBlockCount } : undefined
                },
                domInfraHints: {
                    generatorMeta: (function () {
                        const m = document.querySelector('meta[name="generator"]');
                        const c = m && m.getAttribute('content');
                        return c ? c.trim() : null;
                    }()),
                    scriptSrcs: Array.from(document.querySelectorAll('script[src]')).map(function (el) {
                        try {
                            return (el as HTMLScriptElement).src || el.getAttribute('src') || '';
                        } catch {
                            return el.getAttribute('src') || '';
                        }
                    }).filter(Boolean).slice(0, 150),
                    linkHrefs: Array.from(document.querySelectorAll('link[href]')).map(function (el) {
                        try {
                            return (el as HTMLLinkElement).href || el.getAttribute('href') || '';
                        } catch {
                            return el.getAttribute('href') || '';
                        }
                    }).filter(Boolean).slice(0, 60),
                    imgSrcs: Array.from(document.querySelectorAll('img[src]')).map(function (el) {
                        try {
                            return (el as HTMLImageElement).src || el.getAttribute('src') || '';
                        } catch {
                            return el.getAttribute('src') || '';
                        }
                    }).filter(Boolean).slice(0, 120),
                    inlineScriptFingerprint: Array.from(document.querySelectorAll('script:not([src])')).slice(0, 30).map(function (s) {
                        return (s.textContent || '').slice(0, 400);
                    }).join('\n').slice(0, 15000),
                    hasNextData: !!document.getElementById('__NEXT_DATA__'),
                    hasWpJsonLink: !!document.querySelector('link[href*="wp-json"]'),
                    hasWpContentScript: !!document.querySelector('script[src*="wp-content"], script[src*="wp-includes"]')
                },
                dwellSignals: {
                    formFieldCount: document.querySelectorAll(
                        'form input:not([type="hidden"]), form select, form textarea'
                    ).length,
                    videoCount: document.querySelectorAll('video').length,
                    audioCount: document.querySelectorAll('audio').length,
                    scrollHeightOverVh: Math.min(
                        50,
                        Math.round(document.documentElement.scrollHeight / Math.max(window.innerHeight, 1))
                    )
                },
                consentProbe: (function () {
                    var w = window;
                    var tcf = typeof (w as any).__tcfapi === 'function';
                    var hints: string[] = [];
                    if (document.querySelector('[id*="CybotCookiebotDialog"], .CybotCookiebotDialogInner, #Cookiebot')) hints.push('cookiebot');
                    if (document.querySelector('#onetrust-consent-sdk, .onetrust-pc-dark-filter')) hints.push('onetrust');
                    if (document.querySelector('#usercentrics-root, .uc-embed')) hints.push('usercentrics');
                    if (document.querySelector('.fc-consent-root')) hints.push('funding-choices');
                    var dl = (w as any).dataLayer;
                    var dataLayerPreview: string[] = [];
                    if (Array.isArray(dl)) {
                        for (var i = 0; i < Math.min(5, dl.length); i++) {
                            try {
                                var s = JSON.stringify(dl[i]);
                                dataLayerPreview.push(s.length > 120 ? s.slice(0, 120) + '…' : s);
                            } catch (e) {
                                dataLayerPreview.push('[object]');
                            }
                        }
                    }
                    var inlineGtm = false;
                    document.querySelectorAll('script[src]').forEach(function (el) {
                        var src = (el.getAttribute('src') || '').toLowerCase();
                        if (src.indexOf('googletagmanager.com') !== -1 || src.indexOf('gtag/js') !== -1) inlineGtm = true;
                    });
                    document.querySelectorAll('script:not([src])').forEach(function (el) {
                        var t = (el.textContent || '').slice(0, 2000);
                        if (/gtag\s*\(|GTM-|googletagmanager/i.test(t)) inlineGtm = true;
                    });
                    return {
                        tcfApiPresent: tcf,
                        cmpDomHints: hints,
                        dataLayerPreview: dataLayerPreview,
                        inlineGtmOrGtagDetected: inlineGtm
                    };
                })()
            };
        }, SEO_STOPWORD_LIST);

        let seoAudit: SeoAudit = seoAndMeta.seo as SeoAudit;
        const metaDwell = (
            seoAndMeta as {
                dwellSignals?: {
                    formFieldCount: number;
                    videoCount: number;
                    audioCount: number;
                    scrollHeightOverVh: number;
                };
            }
        ).dwellSignals;
        const dwellEstimate = estimateDwellTime({
            bodyWordCount: seoAudit.bodyWordCount ?? 0,
            readabilityGradeLevel: readabilityResult.score,
            brokenLinkCount: linkAudit.broken.length,
            internalLinkCount: linkAudit.internal,
            formFieldCount: metaDwell?.formFieldCount ?? 0,
            videoCount: metaDwell?.videoCount ?? 0,
            audioCount: metaDwell?.audioCount ?? 0,
            scrollHeightOverVh: metaDwell?.scrollHeightOverVh ?? 1,
            skinnyContent: !!seoAudit.skinnyContent
        });
        const seoExtras = seoAndMeta as {
            privacyLinkRows?: Array<{ text: string; href: string }>;
            cookieBannerHeuristic?: boolean;
        };
        const privacyAudit = buildPrivacyAudit(
            seoExtras.privacyLinkRows ?? [],
            url,
            seoExtras.cookieBannerHeuristic ?? false
        );
        const consentProbeRaw = (seoAndMeta as { consentProbe?: ConsentPageProbe }).consentProbe;
        const domHintsForConsent = (seoAndMeta as { domInfraHints?: DomInfraHints }).domInfraHints;
        const consentModeFromInline = extractConsentModeHintsFromInline(domHintsForConsent?.inlineScriptFingerprint ?? '');
        const defaultConsentProbe: ConsentPageProbe = {
            tcfApiPresent: false,
            cmpDomHints: [],
            dataLayerPreview: [],
            inlineGtmOrGtagDetected: false,
        };
        const consentSignals = buildConsentSignals(
            consentProbeRaw ?? defaultConsentProbe,
            consentModeFromInline,
            earlyThirdPartyScriptHosts
        );
        const eeatSignals = (seoAndMeta as { eeatPage?: import('./types').EeatPageSignals }).eeatPage;
        const bodyTextExcerpt = (seoAndMeta as { bodyTextExcerpt?: string }).bodyTextExcerpt;

        // 5c. Geo Location Lookup & CDN Detection
        let locationData: any = null;
        const ip = serverIp as string | null;
        const isPublicIp =
            !!ip &&
            typeof ip === 'string' &&
            ip !== '' &&
            ip !== '0.0.0.0' &&
            !ip.startsWith('127.') &&
            !ip.startsWith('10.') &&
            !ip.startsWith('192.168.') &&
            !/^172\.(1[6-9]|2\d|3[01])\./.test(ip);
        if (isPublicIp) {
            try {
                const { API_IP_API_BASE } = await import('./external-apis');
                const geoRes = await fetch(`${API_IP_API_BASE}/json/${ip}`);
                const geoJson: any = await geoRes.json();
                if (geoJson.status === 'success') {
                    locationData = {
                        city: geoJson.city,
                        country: geoJson.country,
                        countryCode: geoJson.countryCode,
                        continent: geoJson.timezone?.split('/')[0] || 'Unknown',
                        region: geoJson.regionName
                    };
                }
            } catch (e) {
                const cause = e instanceof Error && e.cause instanceof Error ? e.cause : e;
                const isNetwork = cause instanceof Error && (
                    (cause as NodeJS.ErrnoException).code === 'ECONNRESET' ||
                    cause.message?.includes('ECONNRESET') ||
                    cause.message?.includes('fetch failed')
                );
                if (isNetwork) {
                    if (!geoNetworkWarned) {
                        geoNetworkWarned = true;
                        console.warn('Geo lookup skipped (network error). Scan continues without location.');
                    }
                } else {
                    console.error('Geo lookup failed:', e);
                }
            }
        }

        // CDN Detection Heuristics
        const h = mainHeaders;
        let cdnProvider: string | null = null;
        const serverHdr = getHeader(h, 'server') ?? '';
        if (getHeader(h, 'cf-ray') || serverHdr.toLowerCase().includes('cloudflare')) cdnProvider = 'Cloudflare';
        else if (getHeader(h, 'x-amz-cf-id')) cdnProvider = 'Amazon CloudFront';
        else if (getHeader(h, 'x-fastly-request-id')) cdnProvider = 'Fastly';
        else if (serverHdr.includes('Akamai')) cdnProvider = 'Akamai';
        else if (getHeader(h, 'x-cdn')) cdnProvider = getHeader(h, 'x-cdn') ?? null;

        const countryCode = locationData?.countryCode ?? null;
        const targetRegionMismatch = !!targetRegion && !!countryCode && !matchesTargetRegion(countryCode, targetRegion);

        const domInfraHints = (seoAndMeta as { domInfraHints?: DomInfraHints }).domInfraHints;
        const infra = inferInfraStackAndTracking({
            hints: domInfraHints,
            serverHeader: serverHdr || null,
            xPoweredBy: getHeader(h, 'x-powered-by') ?? null
        });

        const geoAudit = {
            serverIp,
            location: locationData,
            cdn: {
                detected: !!cdnProvider,
                provider: cdnProvider
            },
            languages: seoAndMeta.geo,
            ...(targetRegionMismatch && { targetRegionMismatch: true }),
            ...(targetRegion && { targetRegion }),
            ...(infra.detectedPlatforms.length > 0 && { detectedPlatforms: infra.detectedPlatforms }),
            ...(infra.detectedTracking.length > 0 && { detectedTracking: infra.detectedTracking }),
            ...((infra.hostingHints.server || infra.hostingHints.poweredBy) && {
                hostingHints: infra.hostingHints
            })
        };

        // Security Headers Audit (main resource headers; Puppeteer returns lowercase keys)
        const ext = seoAndMeta.extended as {
            resourceHints?: { preload: string[]; preconnect: string[] };
            sriMissing?: Array<{ tag: string; url: string }>;
            reducedMotionInCss?: boolean;
            focusVisibleFailCount?: number;
            mediaAccessibility?: { videosWithoutCaptions: number; audiosWithoutTranscript: number };
            manifest?: { present: boolean; url?: string };
            themeColor?: string | null;
            appleTouchIcon?: string | null;
            metaRefreshPresent?: boolean;
            fontDisplayIssues?: { withoutFontDisplay: number; blockCount: number };
        } | undefined;

        const cookieWarnings: Array<{ message: string }> = [];
        const setCookieRaw = getHeader(h, 'set-cookie');
        if (setCookieRaw) {
            const setCookieStr = String(setCookieRaw);
            if (setCookieStr.toLowerCase().indexOf('samesite') === -1) cookieWarnings.push({ message: 'Set-Cookie ohne SameSite' });
            if (pageIsHttps && setCookieStr.toLowerCase().indexOf('secure') === -1) cookieWarnings.push({ message: 'Set-Cookie ohne Secure auf HTTPS' });
        }

        const securityAudit = {
            contentSecurityPolicy: {
                present: !!getHeader(h, 'content-security-policy'),
                value: getHeader(h, 'content-security-policy')
            },
            xFrameOptions: {
                present: !!getHeader(h, 'x-frame-options'),
                value: getHeader(h, 'x-frame-options')
            },
            xContentTypeOptions: {
                present: !!getHeader(h, 'x-content-type-options'),
                value: getHeader(h, 'x-content-type-options')
            },
            strictTransportSecurity: {
                present: !!getHeader(h, 'strict-transport-security'),
                value: getHeader(h, 'strict-transport-security')
            },
            referrerPolicy: {
                present: !!getHeader(h, 'referrer-policy'),
                value: getHeader(h, 'referrer-policy')
            },
            permissionsPolicy: {
                present: !!(getHeader(h, 'permissions-policy') || getHeader(h, 'feature-policy')),
                value: getHeader(h, 'permissions-policy') ?? getHeader(h, 'feature-policy')
            },
            crossOriginOpenerPolicy: {
                present: !!getHeader(h, 'cross-origin-opener-policy'),
                value: getHeader(h, 'cross-origin-opener-policy')
            },
            crossOriginEmbedderPolicy: {
                present: !!getHeader(h, 'cross-origin-embedder-policy'),
                value: getHeader(h, 'cross-origin-embedder-policy')
            },
            crossOriginResourcePolicy: {
                present: !!getHeader(h, 'cross-origin-resource-policy'),
                value: getHeader(h, 'cross-origin-resource-policy')
            },
            mixedContentUrls: mixedContentUrls.length > 0 ? mixedContentUrls : undefined,
            sriMissing: ext?.sriMissing && ext.sriMissing.length > 0 ? ext.sriMissing : undefined,
            cookieWarnings: cookieWarnings.length > 0 ? cookieWarnings : undefined
        };

        // 5d. GEO (Generative Engine Optimization) - Technical Checks + robots/sitemap for SEO
        let hasLlmsTxt = false;
        let hasRobotsAllowingAI = true; // Default to true if fine, or if robots.txt is missing
        let robotsTxtPresent = false;
        let sitemapUrl: string | null = null;
        let llmsParsed: import('./llms-txt-parse').LlmsTxtParsed | null = null;
        const aiBotList = ['GPTBot', 'PerplexityBot', 'CCBot', 'GoogleOther', 'Anthropic-AI', 'Claude-Web'];
        const aiBotStatus: Array<{ bot: string; status: 'allowed' | 'blocked' }> = [];
        const llmsTxtRobotsConsistencyWarnings: string[] = [];
        let llmsTxtMarkdownUrlsReachable: Array<{ url: string; status: number }> = [];

        try {
            const origin = new URL(url).origin;

            const llmsTxtRes = await fetch(`${origin}/llms.txt`);
            if (llmsTxtRes.ok) {
                hasLlmsTxt = true;
                const llmsBody = await llmsTxtRes.text();
                const { parseLlmsTxt } = await import('./llms-txt-parse');
                llmsParsed = parseLlmsTxt(llmsBody, origin);
                if (llmsParsed.markdownUrls.length > 0) {
                    const results = await Promise.all(
                        llmsParsed.markdownUrls.slice(0, 5).map(async (mdUrl) => {
                            try {
                                const r = await fetch(mdUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
                                return { url: mdUrl, status: r.status };
                            } catch {
                                return { url: mdUrl, status: 0 };
                            }
                        })
                    );
                    llmsTxtMarkdownUrlsReachable = results;
                }
            }

            const robotsRes = await fetch(`${origin}/robots.txt`);
            let robotsTxt = '';
            if (robotsRes.ok) {
                robotsTxtPresent = true;
                robotsTxt = await robotsRes.text();
                aiBotList.forEach(bot => {
                    const uaMatch = robotsTxt.match(new RegExp('User-agent:\\s*' + bot.replace(/[.*+?^${}()|[\]\\]/g, '\\$0') + '\\s*([\\s\\S]*?)(?=User-agent:|$)', 'i'));
                    const block = uaMatch ? /Disallow:\\s*\/\s*(\s|$)/m.test(uaMatch[1]) : false;
                    aiBotStatus.push({ bot, status: block ? 'blocked' : 'allowed' });
                    if (block) hasRobotsAllowingAI = false;
                });
                const sitemapMatch = robotsTxt.match(/^\s*Sitemap:\s*(.+)\s*$/im);
                if (sitemapMatch && sitemapMatch[1]) {
                    sitemapUrl = sitemapMatch[1].trim();
                }
            }

            if (hasLlmsTxt && llmsParsed && llmsParsed.allowPaths.length > 0) {
                for (const bot of aiBotList) {
                    const uaMatch = robotsTxt.match(new RegExp('User-agent:\\s*' + bot.replace(/[.*+?^${}()|[\]\\]/g, '\\$0') + '\\s*([\\s\\S]*?)(?=User-agent:|$)', 'i'));
                    const blocked = uaMatch ? /Disallow:\\s*\/\s*(\s|$)/m.test(uaMatch[1]) : false;
                    if (blocked) {
                        llmsTxtRobotsConsistencyWarnings.push(`robots.txt blockiert ${bot}, llms.txt erlaubt jedoch Pfade (Allow)`);
                        break;
                    }
                }
            }
        } catch (e) {
            // Ignore fetch errors
        }

        seoAudit = { ...seoAudit, robotsTxtPresent, sitemapUrl };

        const { detectYmyl } = await import('./ymyl-heuristic');
        const ymylResult = detectYmyl(
            url,
            seoAudit.title,
            (bodyTextExcerpt ?? '').toLowerCase(),
            seoAudit.metaDescription ?? ''
        );

        // GEO dimensions: Auffindbarkeit + Wiederverwertbarkeit (0–100 each) + blended headline score
        const g = seoAndMeta.generative as typeof seoAndMeta.generative & {
            hasFaqPageSchema?: boolean;
            hasHowToSchema?: boolean;
            faqMainEntityCount?: number;
            howToStepCount?: number;
            hasBreadcrumbList?: boolean;
            organizationOrWebSiteWithTrust?: boolean;
            hasSameAsOrLogo?: boolean;
            headingH2Count?: number;
            headingH3Count?: number;
            hasSingleH1?: boolean;
            mainContentWordRatio?: number;
            definitionListPairCount?: number;
        };
        const citationsWithLinks = g.citationsWithLinks ?? 0;

        const geoDim = computeGeoDimensionsScore({
            hasRobotsAllowingAI,
            hasLlmsTxt,
            metaRobotsIndexable: g.metaRobotsIndexable ?? true,
            recommendedSchemaTypesFound: g.recommendedSchemaTypesFound ?? [],
            robotsTxtPresent: seoAudit.robotsTxtPresent,
            sitemapUrlPresent: !!seoAudit.sitemapUrl,
            jsonLdErrors: g.schemaParseErrors,
            llmsTxtRobotsConsistencyWarnings,
            repurposing: {
                hasFaqPageSchema: g.hasFaqPageSchema,
                hasHowToSchema: g.hasHowToSchema,
                faqMainEntityCount: g.faqMainEntityCount,
                howToStepCount: g.howToStepCount,
                hasBreadcrumbList: g.hasBreadcrumbList,
                organizationOrWebSiteWithTrust: g.organizationOrWebSiteWithTrust,
                hasSameAsOrLogo: g.hasSameAsOrLogo,
                headingH2Count: g.headingH2Count,
                headingH3Count: g.headingH3Count,
                hasSingleH1: g.hasSingleH1,
                mainContentWordRatio: g.mainContentWordRatio,
                definitionListPairCount: g.definitionListPairCount,
            },
            tableCount: g.tableCount,
            faqDomCount: g.faqCount,
            listDensity: g.listDensity,
            citationCount: g.citationCount,
            citationsWithLinks,
            hasAuthorBio: g.hasAuthorBio,
            articleSchemaQuality: g.articleSchemaQuality,
            structuredDataRequiredFields: seoAudit.structuredDataRequiredFields,
            jsonLdRichResultGaps: seoAudit.jsonLdRichResultGaps,
            eeat: eeatSignals
                ? {
                      hasImpressum: eeatSignals.hasImpressum,
                      hasContact: eeatSignals.hasContact,
                      hasAboutLink: eeatSignals.hasAboutLink,
                      hasTeamLink: eeatSignals.hasTeamLink,
                      hasCaseStudyMention: eeatSignals.hasCaseStudyMention,
                  }
                : undefined,
            isYmyl: ymylResult.isYmyl,
        });

        const generativeAudit = {
            score: geoDim.score,
            dimensions: geoDim.dimensions,
            discoverabilitySignals: geoDim.discoverabilitySignals,
            repurposingSignals: geoDim.repurposingSignals,
            dimensionBreakdown: geoDim.dimensionBreakdown,
            scoreBreakdown: geoDim.scoreBreakdown,
            technical: {
                hasLlmsTxt,
                hasRobotsAllowingAI,
                schemaCoverage: g.schemaCoverage,
                jsonLdErrors: g.schemaParseErrors,
                llmsTxtSections: llmsParsed?.sections?.length ? llmsParsed.sections : undefined,
                llmsTxtHasSitemap: llmsParsed?.hasSitemap,
                aiBotStatus: aiBotStatus.length > 0 ? aiBotStatus : undefined,
                metaRobotsContent: g.metaRobotsContent ?? undefined,
                metaRobotsIndexable: g.metaRobotsIndexable,
                recommendedSchemaTypesFound: g.recommendedSchemaTypesFound,
                missingRecommendedSchemaTypes: g.missingRecommendedSchemaTypes,
                articleSchemaQuality: g.articleSchemaQuality,
                llmsTxtRulesContent: llmsParsed?.rulesContent,
                llmsTxtRobotsConsistencyWarnings: llmsTxtRobotsConsistencyWarnings.length > 0 ? llmsTxtRobotsConsistencyWarnings : undefined,
                llmsTxtSpecCompliant: llmsParsed ? { hasTitle: llmsParsed.hasTitle, hasDescription: llmsParsed.hasDescription } : undefined,
                llmsTxtMarkdownUrlsReachable: llmsTxtMarkdownUrlsReachable.length > 0 ? llmsTxtMarkdownUrlsReachable : undefined,
            },
            content: {
                faqCount: g.faqCount,
                tableCount: g.tableCount,
                listDensity: g.listDensity,
                citationDensity: g.citationCount,
                citationsWithLinks: citationsWithLinks > 0 ? citationsWithLinks : undefined,
            },
            expertise: {
                hasAuthorBio: g.hasAuthorBio,
                hasExpertCitations: g.citationCount > 3
            }
        };



        // 6. Focus Order Detection
        const focusOrder = await page.evaluate(`
            (function() {
                function isVisible(el) {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
                }

                const selector = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
                const elements = Array.from(document.querySelectorAll(selector));

                const focusable = elements.filter(function(el) { return isVisible(el) && !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'; });

                const positiveTabIndex = focusable.filter(function(el) { return (parseInt(el.getAttribute('tabindex') || '0', 10) > 0); })
                    .sort(function(a, b) { return parseInt(a.getAttribute('tabindex') || '0', 10) - parseInt(b.getAttribute('tabindex') || '0', 10); });

                const zeroTabIndex = focusable.filter(function(el) {
                    const t = el.getAttribute('tabindex');
                    return !t || parseInt(t, 10) === 0;
                });

                const sorted = positiveTabIndex.concat(zeroTabIndex);

                return sorted.map(function(el, index) {
                    const rect = el.getBoundingClientRect();
                    return {
                        index: index + 1,
                        text: (el.innerText || el.getAttribute('aria-label') || el.tagName).slice(0, 30).trim(),
                        role: el.tagName.toLowerCase(),
                        rect: {
                            x: Math.round(rect.x),
                            y: Math.round(rect.y),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        }
                    };
                }).slice(0, 50);
            })()
        ` as any);

        // 7. Advanced Pro-Level Checks (Structure, Alt, Aria, Form)
        // We use a string function to avoid any transpilation/instrumentation issues (__name is not defined)
        const advancedChecksScript = `
            (function() {
                function getRect(el) {
                    const r = el.getBoundingClientRect();
                    return {
                        x: Math.round(r.x),
                        y: Math.round(r.y),
                        width: Math.round(r.width),
                        height: Math.round(r.height)
                    };
                }
                
                // --- 7a. Semantic Structure Map (headings, landmarks, sections, buttons, paragraphs in document order) + per-section content and links ---
                const structureMap = [];
                var selector = 'h1, h2, h3, h4, h5, h6, nav, main, aside, footer, header, section, article, [role="region"], [role="navigation"], button, [role="button"], p';
                function getSectionLinks(container) {
                    var out = [];
                    try {
                        (container.querySelectorAll && container.querySelectorAll('a[href]')) || [].forEach(function(a) {
                            var href = a.getAttribute('href');
                            if (href && href.trim()) out.push({ href: href.trim(), text: (a.textContent || '').trim().slice(0, 100) });
                        });
                    } catch (e) {}
                    return out;
                }
                document.querySelectorAll(selector).forEach(function(el) {
                    var level = 0;
                    var tag = el.tagName.toLowerCase();
                    var role = (el.getAttribute('role') || '').toLowerCase();
                    if (el.tagName.match(/^H[1-6]$/)) {
                        level = parseInt(el.tagName[1]);
                    } else if (el.tagName === 'BUTTON' || role === 'button') {
                        level = 7;
                        tag = 'button';
                    } else if (el.tagName === 'P') {
                        level = 8;
                    } else if (el.tagName === 'SECTION' || el.tagName === 'ARTICLE' || role === 'region' || role === 'navigation') {
                        level = 9;
                        if (role === 'region') tag = 'region';
                        else if (role === 'navigation') tag = 'navigation';
                    }
                    var r = el.getBoundingClientRect();
                    if (r.width === 0 && r.height === 0) return;
                    var contentSnippet = '';
                    var links = [];
                    var isLandmark = ['nav','main','aside','footer','header','section','article','region','navigation'].indexOf(tag) !== -1 || level === 9;
                    if (isLandmark) {
                        contentSnippet = (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1500);
                        links = getSectionLinks(el);
                    } else if (level >= 1 && level <= 6) {
                        var next = el.nextElementSibling;
                        while (next) {
                            var nextTag = next.tagName ? next.tagName.toLowerCase() : '';
                            if (nextTag.match(/^h[1-6]$/)) {
                                var nextLevel = parseInt(nextTag[1]);
                                if (nextLevel <= level) break;
                            }
                            contentSnippet += (next.innerText || '') + ' ';
                            links = links.concat(getSectionLinks(next));
                            next = next.nextElementSibling;
                        }
                        contentSnippet = contentSnippet.replace(/\\s+/g, ' ').trim().slice(0, 1500);
                    } else if (level === 7 || level === 8) {
                        contentSnippet = (el.textContent || '').trim().slice(0, 500);
                    }
                    structureMap.push({
                        tag: tag,
                        text: (el.textContent || '').slice(0, 300).trim(),
                        level: level,
                        rect: {
                            x: Math.round(r.x),
                            y: Math.round(r.y),
                            width: Math.round(r.width),
                            height: Math.round(r.height)
                        },
                        contentSnippet: contentSnippet || undefined,
                        links: links.length > 0 ? links : undefined
                    });
                });

                // --- 7b. Touch Target Heatmap (All small elements) ---
                const touchTargets = []; 
                
                document.querySelectorAll('a, button, input, [role="button"]').forEach(function(el) {
                    const r = el.getBoundingClientRect();
                    // Ignore hidden or tiny elements
                    if (r.width === 0 || r.height === 0 || window.getComputedStyle(el).display === 'none') return;

                    if (r.width < 44 || r.height < 44) {
                        // Generate simple selector
                        let selector = el.tagName.toLowerCase();
                        if (el.id) selector += '#' + el.id;
                        else if (el.className && typeof el.className === 'string') selector += '.' + el.className.split(' ')[0];

                        touchTargets.push({
                            selector: selector,
                            element: el.tagName.toLowerCase(),
                            text: (el.textContent || '').slice(0, 50).trim(),
                            rect: {
                                x: Math.round(r.x),
                                y: Math.round(r.y),
                                width: Math.round(r.width),
                                height: Math.round(r.height)
                            },
                            size: { width: Math.round(r.width), height: Math.round(r.height) },
                            message: 'Target size ' + Math.round(r.width) + 'x' + Math.round(r.height) + 'px is too small.'
                        });
                    }
                });

                // --- 7c. Smart Alt-Text Analysis + Image dimensions/lazy/srcset ---
                const altTextIssues = [];
                let missingDimensions = 0, missingLazy = 0, missingSrcset = 0;
                const imageDetails = [];
                document.querySelectorAll('img').forEach(function(img) {
                    const alt = (img.getAttribute('alt') || '').trim();
                    const src = (img.getAttribute('src') || '').trim();
                    const r = img.getBoundingClientRect();
                    const rect = {
                        x: Math.round(r.x),
                        y: Math.round(r.y),
                        width: Math.round(r.width),
                        height: Math.round(r.height)
                    };
                    const hasWidth = !!(img.getAttribute('width') || img.width);
                    const hasHeight = !!(img.getAttribute('height') || img.height);
                    if (!hasWidth || !hasHeight) {
                        missingDimensions++;
                        if (imageDetails.length < 5) imageDetails.push({ reason: 'Missing width/height', selector: img.tagName + (img.src ? '' : '') });
                    }
                    const loading = (img.getAttribute('loading') || '').toLowerCase();
                    if (loading !== 'lazy' && loading !== 'eager') {
                        missingLazy++;
                        if (imageDetails.length < 5) imageDetails.push({ reason: 'Missing loading="lazy"', selector: img.tagName });
                    }
                    if (!img.getAttribute('srcset')) {
                        missingSrcset++;
                    }
                    if (img.getAttribute('alt') === null) {
                        altTextIssues.push({
                            imgHtml: img.outerHTML.slice(0, 50),
                            alt: '[MISSING]',
                            rect: rect,
                            reason: 'Missing alt attribute'
                        });
                    } else if (alt === '') {
                        // Decorative
                    } else {
                        const filename = src.split('/').pop().split('?')[0] || '';
                        if (alt.toLowerCase().endsWith('.jpg') || alt.toLowerCase().endsWith('.png') || alt === filename) {
                            altTextIssues.push({ imgHtml: img.outerHTML.slice(0, 50), alt: alt, rect: rect, reason: 'Alt text looks like a filename' });
                        } else if (['image', 'picture', 'spacer', 'white', 'logo'].indexOf(alt.toLowerCase()) !== -1) {
                            altTextIssues.push({ imgHtml: img.outerHTML.slice(0, 50), alt: alt, rect: rect, reason: 'Alt text is generic/redundant' });
                        } else if (alt.length < 5) {
                            altTextIssues.push({ imgHtml: img.outerHTML.slice(0, 50), alt: alt, rect: rect, reason: 'Alt text is extremely short' });
                        }
                    }
                });
                const imageIssues = (missingDimensions > 0 || missingLazy > 0 || missingSrcset > 0) ? {
                    missingDimensions: missingDimensions,
                    missingLazy: missingLazy,
                    missingSrcset: missingSrcset,
                    details: imageDetails.length > 0 ? imageDetails : undefined
                } : undefined;

                // --- 7d. ARIA Integrity ---
                const ariaIssues = [];
                document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls]').forEach(function(el) {
                    ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(function(attr) {
                        if (el.hasAttribute(attr)) {
                            const ids = (el.getAttribute(attr) || '').split(' ');
                            ids.forEach(function(id) {
                                if (id && !document.getElementById(id)) {
                                    const r = el.getBoundingClientRect();
                                    ariaIssues.push({
                                        element: el.tagName.toLowerCase(),
                                        attribute: attr,
                                        value: id,
                                        rect: {
                                            x: Math.round(r.x),
                                            y: Math.round(r.y),
                                            width: Math.round(r.width),
                                            height: Math.round(r.height)
                                        },
                                        message: 'Referenced ID "' + id + '" does not exist.'
                                    });
                                }
                            });
                        }
                    });
                });

                // --- 7e. Form UX (Orphan Inputs) ---
                const formIssues = [];
                let missingAutocomplete = 0;
                let suspiciousInputType = 0;
                let ariaInvalidWithoutDescription = 0;
                document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(function(el) {
                    const parentLabel = el.closest('label');
                    const hasId = el.id && document.querySelector('label[for="' + el.id + '"]');
                    const hasAriaLabel = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
                    
                    if (!parentLabel && !hasId && !hasAriaLabel) {
                        const r = el.getBoundingClientRect();
                        formIssues.push({
                            element: el.tagName.toLowerCase(),
                            rect: {
                                x: Math.round(r.x),
                                y: Math.round(r.y),
                                width: Math.round(r.width),
                                height: Math.round(r.height)
                            },
                            message: 'Form element has no associated label.'
                        });
                    }
                });
                document.querySelectorAll('input, select, textarea').forEach(function(el) {
                    const tag = el.tagName.toLowerCase();
                    const name = (el.getAttribute('name') || '').toLowerCase();
                    const typ = (el.getAttribute('type') || 'text').toLowerCase();
                    if (tag === 'input' && (typ === 'email' || typ === 'tel' || name.indexOf('email') !== -1 || name.indexOf('phone') !== -1 || name.indexOf('tel') !== -1)) {
                        if (!el.getAttribute('autocomplete')) missingAutocomplete++;
                    }
                    if (tag === 'input' && typ === 'text' && (name === 'email' || name.indexOf('email') !== -1)) suspiciousInputType++;
                    if (el.getAttribute('aria-invalid') === 'true' && !el.getAttribute('aria-describedby')) ariaInvalidWithoutDescription++;
                });

                return {
                    structureMap: structureMap,
                    touchTargets: touchTargets,
                    altTextIssues: altTextIssues,
                    ariaIssues: ariaIssues,
                    formIssues: formIssues,
                    imageIssues: imageIssues,
                    formAccessibility: {
                        missingAutocomplete: missingAutocomplete,
                        suspiciousInputType: suspiciousInputType,
                        ariaInvalidWithoutDescription: ariaInvalidWithoutDescription
                    }
                };
            })();
        `;

        // Use 'any' cast to satisfy TS because evaluate expects a function usually, but accepts string in vanilla puppeteer
        // Puppeteer source: evaluate(pageFunction, ...args) -> usually function or string
        const advancedChecks = await page.evaluate(advancedChecksScript as any);

        // Heading hierarchy from structureMap (headings only: level 1-6)
        const headingEntries = (advancedChecks.structureMap || []).filter((n: { level: number }) => n.level >= 1 && n.level <= 6);
        const h1Count = headingEntries.filter((n: { level: number }) => n.level === 1).length;
        const outline = headingEntries.map((n: { level: number; text: string }) => ({ level: n.level, text: n.text || '' }));
        const skippedLevels: Array<{ from: number; to: number }> = [];
        let prevLevel = 0;
        headingEntries.forEach((n: { level: number }) => {
            if (prevLevel > 0 && n.level > prevLevel + 1) skippedLevels.push({ from: prevLevel, to: n.level });
            if (n.level >= 1) prevLevel = n.level;
        });
        const headingHierarchy = headingEntries.length > 0 ? {
            hasSingleH1: h1Count === 1,
            h1Count,
            skippedLevels,
            outline
        } : undefined;

        // Iframes: title attribute (a11y)
        const iframeIssues = await page.evaluate(function () {
            return Array.from(document.querySelectorAll('iframe')).map(function (el) {
                return { hasTitle: !!(el.getAttribute('title')), src: el.getAttribute('src') || undefined };
            });
        });

        // Service Worker (PWA indicator)
        let serviceWorkerRegistered = false;
        try {
            serviceWorkerRegistered = await page.evaluate(function () {
                return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
            });
        } catch (_) {}

        // Skip-link detection (anchors + button/role=link bypass controls)
        const skipLinkResult = await detectSkipLinkOnPage(page);

        // --- Calculate UX Score (Simple Algorithm) ---
        // 100 Base
        // CLS > 0.1: -10, > 0.25: -25
        // Console Errors: -5 per error (max -20)
        // Broken Links: -10 per link (max -30)

        let uxScore = 100;
        if (clsScore > 0.25) uxScore -= 25;
        else if (clsScore > 0.1) uxScore -= 10;

        uxScore -= Math.min(20, advancedChecks.touchTargets.length * 2);

        if (!viewportCheck.isMobileFriendly) uxScore -= 20;

        uxScore -= Math.min(20, consoleLogs.filter(l => l.type === 'error').length * 5);
        uxScore -= Math.min(30, linkAudit.broken.length * 10);

        uxScore = Math.max(0, Math.round(uxScore));

        const uxResult: ScanResult['ux'] = {
            score: uxScore,
            cls: parseFloat(clsScore.toFixed(3)),
            ...(dwellEstimate != null ? { dwellEstimate } : {}),
            readability: readabilityResult,
            viewport: {
                isMobileFriendly: viewportCheck.isMobileFriendly,
                issues: viewportCheck.issues
            },
            consoleErrors: consoleLogs,
            brokenLinks: linkAudit.broken.map((b) => ({ href: b.url, status: b.statusCode, text: b.text })),
            focusOrder: focusOrder,
            structureMap: advancedChecks.structureMap,
            altTextIssues: advancedChecks.altTextIssues,
            ariaIssues: advancedChecks.ariaIssues,
            formIssues: advancedChecks.formIssues,
            hasSkipLink: skipLinkResult.hasSkipLink,
            skipLinkHref: skipLinkResult.skipLinkHref ?? null,
            resourceHints: ext?.resourceHints,
            reducedMotionInCss: ext?.reducedMotionInCss,
            focusVisibleFailCount: ext?.focusVisibleFailCount,
            mediaAccessibility: ext?.mediaAccessibility
                ? {
                      ...ext.mediaAccessibility,
                      videosMissingCaptionTrack: ext.mediaAccessibility.videosWithoutCaptions,
                  }
                : undefined,
            formAccessibility: (advancedChecks as { formAccessibility?: NonNullable<ScanResult['ux']>['formAccessibility'] })
                .formAccessibility,
            longTasks:
                longTaskStats.count > 0 || longTaskStats.maxDurationMs > 0 ? longTaskStats : undefined,
            tapTargets: {
                issues: advancedChecks.touchTargets.map((t: any) => `${t.element} (${t.size.width}x${t.size.height}px)`),
                details: advancedChecks.touchTargets
            },
            headingHierarchy,
            vagueLinkTexts: allLinksResult.vagueLinkTexts?.length ? allLinksResult.vagueLinkTexts : undefined,
            imageIssues: advancedChecks.imageIssues,
            iframeIssues: iframeIssues.length > 0 ? iframeIssues : undefined,
            metaRefreshPresent: ext?.metaRefreshPresent,
            fontDisplayIssues: ext?.fontDisplayIssues
        };

        let manifestHasName = false;
        let manifestHasIcons = false;
        if (ext?.manifest?.url) {
            try {
                const manRes = await fetch(ext.manifest.url);
                if (manRes.ok) {
                    const man = await manRes.json() as { name?: string; short_name?: string; icons?: unknown[] };
                    manifestHasName = !!(man.name || man.short_name);
                    manifestHasIcons = !!(man.icons && Array.isArray(man.icons) && man.icons.length > 0);
                }
            } catch (_) {}
        }
        const pageHost = (() => {
            try {
                return new URL(url).hostname;
            } catch {
                return '';
            }
        })();
        const thirdPartyDomains = Array.from(allRequestHosts).filter(host => host && host !== pageHost);

        const mergedTracking = mergeTrackingFromThirdPartyHosts(geoAudit.detectedTracking ?? [], thirdPartyDomains);
        const geoForResult =
            mergedTracking.length > 0 ? { ...geoAudit, detectedTracking: mergedTracking } : geoAudit;

        const cacheCtlMain = getHeader(mainHeaders, 'cache-control');
        const maxAgeMatch = cacheCtlMain?.match(/max-age=(\d+)/i);
        const maxAgeHtml = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
        const htmlLongCache = maxAgeHtml > 3600;
        const staticAssetCacheWeak =
            scriptTransferBytesApprox > 400_000 && (maxAgeHtml < 600 || !cacheCtlMain);

        const technicalInsights = {
            thirdPartyDomains,
            manifest: {
                present: !!ext?.manifest?.present,
                hasName: manifestHasName,
                hasIcons: manifestHasIcons,
                url: ext?.manifest?.url
            },
            themeColor: ext?.themeColor ?? null,
            appleTouchIcon: ext?.appleTouchIcon ?? null,
            serviceWorkerRegistered,
            redirectCount: mainRedirectCount,
            metaRefreshPresent: ext?.metaRefreshPresent,
            mainDocumentCache: {
                cacheControl: cacheCtlMain ?? null,
                etagPresent: !!getHeader(mainHeaders, 'etag'),
                htmlLongCache,
            },
            staticAssetCacheWeak,
        };

        const pageOrigin = new URL(url).origin;
        const internalLinks = uniqueLinksList
            .filter(l => isInternalLink(l.href, pageOrigin))
            .map(l => l.href);
        const internalLinksWithLabels = uniqueLinksList
            .filter(l => isInternalLink(l.href, pageOrigin))
            .map(l => ({ href: l.href, text: (l.text || '').slice(0, 100).trim() }));

        phaseTiming.mark('content_pipeline');
        const durationMs = Date.now() - startTime;
        const stats = computeStats(issues);

        const pageIndex = buildPageIndex(
            advancedChecks.structureMap || [],
            viewport.height,
            url
        );

        let greenWebHosted: boolean | null | undefined;
        let greenWebCheckedAt: string | undefined;
        let greenWebSource: string | undefined;
        if (process.env.GREEN_WEB_API_ENABLED === '1' && pageHost) {
            greenWebSource = 'thegreenwebfoundation.org';
            try {
                const { API_GREEN_WEB_GREENCHECK_BASE } = await import('./external-apis');
                const gr = await fetch(
                    `${API_GREEN_WEB_GREENCHECK_BASE}/greencheck/v3/${encodeURIComponent(pageHost)}`,
                    { signal: AbortSignal.timeout(SCAN_GREEN_WEB_FETCH_TIMEOUT_MS) }
                );
                if (gr.ok) {
                    const j = (await gr.json()) as { green?: boolean };
                    greenWebHosted = j.green === true;
                    greenWebCheckedAt = new Date().toISOString();
                } else {
                    greenWebHosted = null;
                }
            } catch {
                greenWebHosted = null;
            }
        }

        const result: ScanResult = {
            id: scanId,
            groupId,
            url,
            timestamp: new Date().toISOString(),
            standard,
            device,
            runners,
            issues,
            passes,
            stats,
            durationMs,
            score: calculateScore(stats),
            screenshot,
            allLinks: internalLinks,
            allLinksWithLabels: internalLinksWithLabels,
            performance: {
                ...perfData,
                ...(scriptTransferBytesApprox > 0 ? { scriptTransferBytesApprox } : {}),
            },
            eco: {
                co2: parseFloat(co2Grams.toFixed(3)),
                grade: ecoGrade,
                pageWeight: totalBytes,
                ...(greenWebHosted !== undefined
                    ? {
                          greenWebHosted,
                          ...(greenWebCheckedAt ? { greenWebCheckedAt } : {}),
                          ...(greenWebSource ? { greenWebSource } : {}),
                      }
                    : {}),
            },
            ux: uxResult,
            seo: seoAudit,
            links: linkAudit,
            geo: geoForResult,
            privacy: privacyAudit,
            ...(consentSignals ? { consentSignals } : {}),
            eeatSignals: eeatSignals ?? undefined,
            generative: generativeAudit,
            security: securityAudit,
            technicalInsights,
            pageIndex,
            ...(bodyTextExcerpt != null && bodyTextExcerpt !== '' ? { bodyTextExcerpt } : {}),
            ymyl: ymylResult
        };

        const { buildContentFingerprint } = await import('./content-fingerprint');
        const contentFingerprint = buildContentFingerprint({
            title: seoAudit.title,
            h1: seoAudit.h1,
            bodyTextExcerpt,
        });
        if (contentFingerprint) {
            result.contentFingerprint = contentFingerprint;
        }

        const etag = getHeader(mainHeaders, 'etag')?.trim();
        const lastModified = getHeader(mainHeaders, 'last-modified')?.trim();
        if (etag || lastModified) {
            result.documentCacheHints = {
                ...(etag ? { etag } : {}),
                ...(lastModified ? { lastModified } : {}),
            };
        }

        const contentFreshnessHints = (seoAndMeta as { contentFreshnessHints?: ContentFreshnessHints })
            .contentFreshnessHints;
        result.contentFreshness = computeContentFreshness({
            documentCacheHints: result.documentCacheHints,
            mainDocumentCache: technicalInsights.mainDocumentCache,
            structured: contentFreshnessHints,
            scanTimestampIso: result.timestamp,
        });

        report('page_classification');
        phaseTiming.mark('pre_classification');
        const { classifyPageWithLlm } = await import('./llm/page-classification');
        const { reportUsage } = await import('./usage-report');
        const classifyOutcome = await classifyPageWithLlm(result).catch(() => null);
        if (classifyOutcome?.classification) {
            result.pageClassification = classifyOutcome.classification;
        }
        if (
            userId &&
            classifyOutcome?.usage &&
            (classifyOutcome.usage.input_tokens > 0 || classifyOutcome.usage.output_tokens > 0)
        ) {
            try {
                reportUsage({
                    userId,
                    eventType: 'llm_request',
                    rawUnits: {
                        input_tokens: classifyOutcome.usage.input_tokens,
                        output_tokens: classifyOutcome.usage.output_tokens,
                    },
                    idempotencyKey: `page_classify_inline:${scanId}`,
                });
            } catch {
                /* never affect scan */
            }
        }

        phaseTiming.mark('classification');
        phaseTiming.finishAndLog({
            scanId,
            device,
            url,
            totalMs: Date.now() - startTime,
        });

        return normalizeScanResultForPersist(result);
    } finally {
        try {
            await page.close();
        } catch {
            /* page may already be closed */
        }
        if (ownBrowser) {
            try {
                await browser.close();
            } catch {
                /* browser may already be closed */
            }
        }
    }
}
