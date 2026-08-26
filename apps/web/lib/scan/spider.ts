import { runScan } from './scanner';
import { discoverSitemapPageUrls } from './sitemap';
import type { ScanResult, DomainScanResult, DomainScanResultWithFullPages, EeatDomainAggregate } from './types';
import { v4 as uuidv4 } from 'uuid';
import { normalizeScanUrl } from '@/lib/scan/url-normalize';
import {
    DOMAIN_SCAN_DEFAULT_MAX_PAGES,
    DOMAIN_SCAN_MAX_PAGES_CAP,
    resolveDomainScanMaxPages,
} from '@/lib/scan/domain-scan-max-pages';

export { DOMAIN_SCAN_DEFAULT_MAX_PAGES, DOMAIN_SCAN_MAX_PAGES_CAP, resolveDomainScanMaxPages };

const MAX_DEPTH = 3; // Home + 3 levels; max pages will likely hit first

/** How many pages to scan in parallel during domain scan (env: DOMAIN_SCAN_CONCURRENCY). */
const DOMAIN_SCAN_CONCURRENCY = Math.min(
    12,
    Math.max(1, parseInt(process.env.DOMAIN_SCAN_CONCURRENCY || '3', 10) || 3),
);

/** Delay (ms) between starting new page scans to avoid rate limiting (env: DOMAIN_SCAN_DELAY_MS). */
const DOMAIN_SCAN_DELAY_MS = Math.max(0, parseInt(process.env.DOMAIN_SCAN_DELAY_MS || '500', 10) || 500);

/** Return value from DB-backed scan control (pause / resume / cancel). */
export type DomainScanControlState = 'run' | 'pause' | 'cancel';

export type DomainScanOptions = {
    /** If true (default), discover sitemap and use its URLs as scan list when available; otherwise pure link crawl. */
    useSitemap?: boolean;
    /** Max number of pages to scan (default 1000). Capped at DOMAIN_SCAN_MAX_PAGES_CAP (10000). */
    maxPages?: number;
    /** Same id as `domain_scans.id` when started via {@link startDomainScan}. */
    domainScanId?: string;
    userId?: string;
    projectId?: string | null;
    /** When true, reuse prior scan if HEAD ETag/Last-Modified matches stored hints. */
    skipUnchangedPages?: boolean;
    /**
     * Poll user-requested pause/cancel from persistence. Omit for unmanaged runs.
     * `pause` blocks before dequeuing new URLs; in-flight scans still finish.
     */
    getScanControl?: () => Promise<DomainScanControlState>;
};

/** Streamed updates from {@link runDomainScan} (UI + usage). */
export type DomainScanStreamUpdate =
    | { type: 'init'; message: string }
    | {
          type: 'progress';
          url: string;
          depth: number;
          scannedCount: number;
          /** Upper bound (maxPages) for UI progress bars. */
          total: number;
          message: string;
      }
    | { type: 'error'; url: string; message: string }
    | {
          type: 'page_complete';
          /** Monotonic index per finished runScan (success or failure), for idempotent usage keys. */
          pageIndex: number;
          url: string;
          normalizedUrl: string;
          ok: boolean;
          reusedUnchanged?: boolean;
      }
    | { type: 'complete'; domainResult: DomainScanResultWithFullPages }
    | { type: 'cancelled'; domainResult: DomainScanResultWithFullPages };

/** Treat www and non-www as same domain for internal link detection */
function isSameDomain(a: string, b: string): boolean {
    try {
        const hostA = new URL(a).hostname.replace(/^www\./i, '');
        const hostB = new URL(b).hostname.replace(/^www\./i, '');
        return hostA === hostB;
    } catch {
        return false;
    }
}

/**
 * URL path depth: porsche.com = 0, porsche.com/australia = 1, porsche.com/australia/models = 2, etc.
 */
function pathDepth(url: string): number {
    try {
        const path = new URL(url).pathname.replace(/\/$/, '');
        if (!path) return 0;
        return path.split('/').filter(Boolean).length;
    } catch {
        return 0;
    }
}

/**
 * Calculates the Domain Health Score
 * Formula: Weighted Average based on depth.
 * Depth 0 (Home) = 1.5x weight
 * Depth 1+ = 1.0x weight
 */
function calculateDomainScore(pages: Array<{ result: ScanResult; depth: number }>): number {
    if (pages.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    pages.forEach((p) => {
        const weight = p.depth === 0 ? 1.5 : 1.0;
        totalWeightedScore += (p.result.ux?.score || p.result.score) * weight;
        totalWeight += weight;
    });

    return Math.round(totalWeightedScore / totalWeight);
}

/**
 * Identifies Systemic Issues (same issue ID appearing on >50% of pages)
 */
function identifySystemicIssues(pages: Array<ScanResult>) {
    const issueMap = new Map<string, { title: string; count: number; urls: string[] }>();
    const totalPages = pages.length;

    pages.forEach((page) => {
        // Use a set to avoid counting the same issue multiple times per page
        const pageIssues = new Set<string>();

        page.issues.forEach((issue) => {
            const key = issue.code; // Unique rule ID (e.g. "color-contrast")
            if (!pageIssues.has(key)) {
                pageIssues.add(key);

                if (!issueMap.has(key)) {
                    issueMap.set(key, { title: issue.message, count: 0, urls: [] });
                }
                const entry = issueMap.get(key)!;
                entry.count++;
                entry.urls.push(page.url);
            }
        });
    });

    // Filter for systemic (present on > 50% of pages, if pages > 1)
    const systemic: DomainScanResult['systemicIssues'] = [];
    issueMap.forEach((val, key) => {
        if (totalPages > 1 && val.count >= Math.ceil(totalPages / 2)) {
            systemic.push({
                issueId: key,
                title: val.title,
                count: val.count,
                pages: val.urls,
            });
        }
    });

    return systemic.sort((a, b) => b.count - a.count);
}

/**
 * Main Spider Function (Generator to allow streaming)
 * When useSitemap is true (default), discovers sitemap and uses its URLs as scan list if available; otherwise crawls by following links.
 */
export async function* runDomainScan(
    startUrl: string,
    options: DomainScanOptions = {},
): AsyncGenerator<DomainScanStreamUpdate, DomainScanResultWithFullPages, unknown> {
    const domainId = options.domainScanId ?? uuidv4();
    const baseUrl = new URL(startUrl);
    const origin = baseUrl.origin;
    const useSitemap = options.useSitemap !== false;
    const maxPages = resolveDomainScanMaxPages(options.maxPages);

    const controlPollMs = 1000;
    const pollControl = async (): Promise<DomainScanControlState> => (await options.getScanControl?.()) ?? 'run';

    async function waitUntilRunOrCancel(): Promise<'run' | 'cancel'> {
        for (;;) {
            const c = await pollControl();
            if (c === 'cancel') return 'cancel';
            if (c === 'run') return 'run';
            await new Promise((r) => setTimeout(r, controlPollMs));
        }
    }

    let userCancel = false;

    // Queue: { url, depth }; seed from sitemap or start URL
    let queue: Array<{ url: string; depth: number }> = [];
    const visited = new Set<string>();
    let sitemapMode = false;

    if (useSitemap) {
        // www-insensitive same-site filter + all robots Sitemap: entries (e.g. vkb.de → www.vkb.de)
        const sitemapUrls = await discoverSitemapPageUrls(origin, maxPages);
        // Only use sitemap when it provides enough URLs; otherwise fall back to link crawl so we discover pages from the first scan
        if (sitemapUrls.length > 1) {
            const startNorm = normalizeScanUrl(startUrl);
            sitemapUrls.forEach((u) => {
                const n = normalizeScanUrl(u);
                if (!visited.has(n)) {
                    visited.add(n);
                    queue.push({ url: u, depth: 0 });
                }
            });
            if (!visited.has(startNorm)) {
                visited.add(startNorm);
                queue.unshift({ url: startUrl, depth: 0 });
            }
            sitemapMode = true;
        }
    }

    if (queue.length === 0) {
        queue = [{ url: startUrl, depth: 0 }];
        visited.add(normalizeScanUrl(startUrl));
    }

    const results: Array<{ result: ScanResult; depth: number }> = [];
    const graphNodes: DomainScanResult['graph']['nodes'] = [];
    const graphLinks: DomainScanResult['graph']['links'] = [];

    yield {
        type: 'init',
        message: sitemapMode
            ? `Starting scan for ${origin} (${queue.length} URLs from sitemap)`
            : `Starting scan for ${origin}`,
    };

    type InFlight = {
        promise: Promise<ScanResult>;
        url: string;
        depth: number;
        normalizedCurrent: string;
        pageIndex: number;
        pageScanId: string;
    };

    const inFlight: InFlight[] = [];
    let nextPageIndex = 0;

    async function tryReuseOrRunFullScan(
        current: { url: string; depth: number },
        pageScanId: string,
    ): Promise<ScanResult> {
        const projectId = options.projectId ?? null
        if (options.skipUnchangedPages && projectId) {
            try {
                const { getLatestCachedPageScan } = await import('@/lib/db/page-scan-cache')
                const { checkPageUnchangedByHeaders } = await import('@/lib/scan/page-unchanged-check')
                const { cloneScanResultForReuse } = await import('@/lib/scan/domain-scan-reuse')
                const { copyScreenshot, readScreenshot } = await import('@/lib/scan/screenshot-storage')
                const prev = await getLatestCachedPageScan({
                    projectId,
                    url: current.url,
                    device: 'desktop',
                })
                if (prev?.documentCacheHints) {
                    const status = await checkPageUnchangedByHeaders(
                        current.url,
                        prev.documentCacheHints,
                    )
                    if (status === 'unchanged') {
                        const prevId = prev.scanResult.id
                        const hasCapture = prevId ? Boolean(await readScreenshot(prevId)) : false
                        if (hasCapture && prevId) {
                            await copyScreenshot(prevId, pageScanId)
                            return cloneScanResultForReuse(
                                prev.scanResult,
                                domainId,
                                current.url,
                                pageScanId,
                            )
                        }
                        // No capture on disk — fall through to full scan (capture required).
                    }
                }
            } catch (err) {
                console.warn('[checkion-v3] page reuse check failed; falling back to full scan', err)
            }
        }

        const result = await runScan({
            url: current.url,
            device: 'desktop',
            standard: 'WCAG2AA',
            groupId: domainId,
            userId: options.userId,
            id: pageScanId,
        })

        if (projectId && !result.reusedUnchanged) {
            try {
                const { upsertCachedPageScan } = await import('@/lib/db/page-scan-cache')
                await upsertCachedPageScan({ projectId, result, device: 'desktop' })
            } catch (err) {
                console.warn('[checkion-v3] page cache upsert failed', err)
            }
        }

        return result
    }

    const processCompleted = (completed: InFlight, result: ScanResult | null, error: Error | null) => {
        const { url, depth, normalizedCurrent } = completed;
        if (result) {
            results.push({ result, depth });
            graphNodes.push({
                id: normalizedCurrent,
                url,
                score: result.ux?.score || result.score,
                depth: pathDepth(url),
                status: 'ok',
                title: result.seo?.title ?? undefined,
            });
            // Always discover internal links from scanned pages (sitemap and link-crawl). So pages like /impact are found even when they're in a sitemap we didn't fetch or only linked from the homepage.
            if (depth < MAX_DEPTH && results.length + queue.length < maxPages * 2) {
                const newLinks = result.allLinks || [];
                newLinks.forEach((link) => {
                    const norm = normalizeScanUrl(link);
                    const isInternal = norm.startsWith(origin) || isSameDomain(link, origin);
                    if (isInternal && !visited.has(norm)) {
                        visited.add(norm);
                        queue.push({ url: link, depth: depth + 1 });
                        graphLinks.push({ source: normalizedCurrent, target: norm });
                    }
                });
            }
        } else {
            console.error(`Failed to scan ${url}`, error);
            graphNodes.push({
                id: normalizedCurrent,
                url,
                score: 0,
                depth: pathDepth(url),
                status: 'error',
            });
        }
    };

    while (results.length < maxPages && (queue.length > 0 || inFlight.length > 0)) {
        // Start new scans up to CONCURRENCY
        while (
            !userCancel &&
            inFlight.length < DOMAIN_SCAN_CONCURRENCY &&
            queue.length > 0 &&
            results.length + inFlight.length < maxPages
        ) {
            const gate = await waitUntilRunOrCancel();
            if (gate === 'cancel') {
                userCancel = true;
                queue.length = 0;
                break;
            }
            const current = queue.shift()!;
            const normalizedCurrent = normalizeScanUrl(current.url);
            const pageIndex = nextPageIndex++;
            const pageScanId = `${domainId}-p${pageIndex}`;
            yield {
                type: 'progress',
                url: current.url,
                depth: current.depth,
                scannedCount: results.length + inFlight.length + 1,
                total: maxPages,
                message: `Scanning ${current.url}...`,
            };
            if (DOMAIN_SCAN_DELAY_MS > 0) {
                await new Promise((r) => setTimeout(r, DOMAIN_SCAN_DELAY_MS));
            }
            const promise = tryReuseOrRunFullScan(current, pageScanId);
            inFlight.push({
                promise,
                url: current.url,
                depth: current.depth,
                normalizedCurrent,
                pageIndex,
                pageScanId,
            });
        }

        if (inFlight.length === 0) break;

        const raceResult = await Promise.race(
            inFlight.map((slot, i) =>
                slot.promise
                    .then((result) => ({ i, slot, result, error: null }))
                    .catch((error) => ({ i, slot, result: null, error: error as Error })),
            ),
        );
        inFlight.splice(raceResult.i, 1);
        if (raceResult.result) {
            processCompleted(raceResult.slot, raceResult.result, null);
        } else {
            processCompleted(raceResult.slot, null, raceResult.error);
            yield {
                type: 'error',
                url: raceResult.slot.url,
                message: raceResult.error?.message ?? 'Scan failed: Unknown error',
            };
        }
        yield {
            type: 'page_complete',
            pageIndex: raceResult.slot.pageIndex,
            url: raceResult.slot.url,
            normalizedUrl: raceResult.slot.normalizedCurrent,
            ok: Boolean(raceResult.result),
            ...(raceResult.result?.reusedUnchanged ? { reusedUnchanged: true } : {}),
        };
    }

    // Parent links from URL path: link each node to its path parent (e.g. /australia/models → /australia) so the graph shows a tree
    const nodeIds = new Set(graphNodes.map((n) => n.id));
    const linkKeys = new Set(graphLinks.map((l) => `${l.source}\t${l.target}`));
    graphNodes.forEach((node) => {
        if (node.depth <= 0) return;
        try {
            const u = new URL(node.url);
            const pathname = u.pathname.replace(/\/$/, '');
            const segments = pathname.split('/').filter(Boolean);
            if (segments.length === 0) return;
            const parentPath = segments.length === 1 ? '/' : '/' + segments.slice(0, -1).join('/');
            const parentUrl = parentPath === '/' ? origin : origin + parentPath;
            const parentNorm = normalizeScanUrl(parentUrl);
            if (parentNorm === node.id || !nodeIds.has(parentNorm)) return;
            const key = `${parentNorm}\t${node.id}`;
            if (linkKeys.has(key)) return;
            linkKeys.add(key);
            graphLinks.push({ source: parentNorm, target: node.id });
        } catch {
            // ignore invalid URLs
        }
    });

    // Link edges from page content: for each scanned page, add edge to every other scanned page it links to (allLinks)
    results.forEach(({ result }) => {
        const sourceNorm = normalizeScanUrl(result.url);
        if (!nodeIds.has(sourceNorm)) return;
        (result.allLinks || []).forEach((href: string) => {
            try {
                const targetNorm = normalizeScanUrl(href);
                if (!nodeIds.has(targetNorm) || targetNorm === sourceNorm) return;
                const key = `${sourceNorm}\t${targetNorm}`;
                if (linkKeys.has(key)) return;
                linkKeys.add(key);
                graphLinks.push({ source: sourceNorm, target: targetNorm });
            } catch {
                // skip invalid URLs
            }
        });
    });

    // E-E-A-T aggregate (from deep scan only)
    const pages = results.map((r) => r.result);
    const totalPages = pages.length;
    const eeat: EeatDomainAggregate = {
        trust: {
            pagesWithImpressum: pages.filter((p) => p.eeatSignals?.hasImpressum).length,
            pagesWithContact: pages.filter((p) => p.eeatSignals?.hasContact).length,
            pagesWithPrivacy: pages.filter((p) => p.privacy?.hasPrivacyPolicy).length,
            totalPages,
        },
        experience: {
            pagesWithAbout: pages.filter((p) => p.eeatSignals?.hasAboutLink).length,
            pagesWithTeam: pages.filter((p) => p.eeatSignals?.hasTeamLink).length,
            pagesWithCaseStudyMention: pages.filter((p) => p.eeatSignals?.hasCaseStudyMention).length,
            totalPages,
        },
        expertise: {
            pagesWithAuthorBio: pages.filter((p) => p.generative?.expertise?.hasAuthorBio).length,
            pagesWithArticleAuthor: pages.filter((p) => p.generative?.technical?.articleSchemaQuality?.hasAuthor)
                .length,
            avgCitationsPerPage:
                totalPages > 0
                    ? pages.reduce((sum, p) => sum + (p.generative?.content?.citationDensity ?? 0), 0) / totalPages
                    : 0,
            totalPages,
        },
        authoritativeness: undefined,
    };

    // Final calculations
    const domainScore = calculateDomainScore(results);
    const systemicIssues = identifySystemicIssues(results.map((r) => r.result));

    const terminalStatus = userCancel ? 'cancelled' : 'complete';
    const finalResult: DomainScanResultWithFullPages = {
        id: domainId,
        domain: origin,
        timestamp: new Date().toISOString(),
        status: terminalStatus,
        progress: {
            scanned: results.length,
            total: maxPages,
        },
        totalPages: results.length,
        score: domainScore,
        pages: results.map((r) => r.result),
        graph: {
            nodes: graphNodes,
            links: graphLinks,
        },
        systemicIssues,
        eeat,
    };

    if (userCancel) {
        yield { type: 'cancelled', domainResult: finalResult };
    } else {
        yield { type: 'complete', domainResult: finalResult };
    }
    return finalResult;
}
