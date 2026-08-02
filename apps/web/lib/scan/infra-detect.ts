/**
 * Heuristic detection of CMS/framework/shop ("stack") and analytics / tags from DOM hints
 * collected in the scanner and optional HTTP response headers.
 */

import { collectDetectedPlatforms } from '@/lib/scan/infra-platform-detect';

export interface DomInfraHints {
    generatorMeta: string | null;
    scriptSrcs: string[];
    linkHrefs: string[];
    /** `img[src]` URLs — improves headless CMS / CDN detection when scripts are server-only. */
    imgSrcs?: string[];
    inlineScriptFingerprint: string;
    hasNextData: boolean;
    hasWpJsonLink: boolean;
    hasWpContentScript: boolean;
}

export interface DetectedTrackingTool {
    id: string;
    name: string;
}

export interface InfraInferenceResult {
    detectedPlatforms: string[];
    detectedTracking: DetectedTrackingTool[];
    hostingHints: { server: string | null; poweredBy: string | null };
}

const MAX_HDR = 200;

function trimHeader(v: string | null | undefined): string | null {
    if (v == null || typeof v !== 'string') return null;
    const t = v.trim();
    if (!t) return null;
    return t.length > MAX_HDR ? `${t.slice(0, MAX_HDR)}…` : t;
}

/** Script / link URL patterns and optional inline checks (id stable for dedupe). */
const TRACKING_RULES: Array<{
    id: string;
    name: string;
    testSrc: (src: string) => boolean;
    testInline?: (inline: string) => boolean;
}> = [
    { id: 'gtm', name: 'Google Tag Manager', testSrc: (s) => /googletagmanager\.com\/gtm\.js/i.test(s) },
    {
        id: 'ga4',
        name: 'Google Analytics (gtag / GA4)',
        testSrc: (s) =>
            /googletagmanager\.com\/gtag\/js/i.test(s) ||
            /google-analytics\.com/i.test(s),
        testInline: (i) => /\bgtag\s*\(/.test(i) || /\bG-[A-Z0-9]{4,}\b/.test(i),
    },
    {
        id: 'fb-pixel',
        name: 'Meta Pixel',
        testSrc: (s) => /connect\.facebook\.net|fbevents\.js/i.test(s),
        testInline: (i) => /\bfbq\s*\(/.test(i),
    },
    { id: 'linkedin', name: 'LinkedIn Insight Tag', testSrc: (s) => /snap\.licdn\.com/i.test(s) },
    { id: 'twitter-x', name: 'X (Twitter) Ads', testSrc: (s) => /static\.ads-twitter\.com/i.test(s) },
    { id: 'bing-ads', name: 'Microsoft Advertising (UET)', testSrc: (s) => /bat\.bing\.com/i.test(s) },
    { id: 'matomo', name: 'Matomo', testSrc: (s) => /matomo|piwik\.php|piwik\.js/i.test(s) },
    { id: 'plausible', name: 'Plausible', testSrc: (s) => /plausible\.io\/js\//i.test(s) },
    { id: 'hotjar', name: 'Hotjar', testSrc: (s) => /static\.hotjar\.com|hotjar\.com\/c/i.test(s) },
    { id: 'clarity', name: 'Microsoft Clarity', testSrc: (s) => /clarity\.ms\/tag/i.test(s) },
    { id: 'segment', name: 'Segment', testSrc: (s) => /cdn\.segment\.com|api\.segment\.io/i.test(s) },
    {
        id: 'hubspot',
        name: 'HubSpot',
        testSrc: (s) => /js\.hs-scripts\.com|js\.hsforms\.net|js-eu1\.hs-scripts\.com|hubspot\.net\/|hubspotfeedback\.com/i.test(s),
    },
    { id: 'mixpanel', name: 'Mixpanel', testSrc: (s) => /api\.mixpanel\.com|cdn\.mxpnl\.com/i.test(s) },
    { id: 'heap', name: 'Heap', testSrc: (s) => /heapanalytics\.com|heap-api/i.test(s) },
    { id: 'fullstory', name: 'FullStory', testSrc: (s) => /fullstory\.com|fs\.js/i.test(s) },
    { id: 'pardot', name: 'Salesforce Pardot', testSrc: (s) => /pi\.pardot\.com/i.test(s) },
    { id: 'tiktok', name: 'TikTok Pixel', testSrc: (s) => /analytics\.tiktok\.com/i.test(s) },
    { id: 'pinterest', name: 'Pinterest Tag', testSrc: (s) => /pintrk|pinterest\.com\/ct\.js/i.test(s) },
    { id: 'reddit', name: 'Reddit Pixel', testSrc: (s) => /redditstatic\.com\/ads/i.test(s) },
    { id: 'snapchat', name: 'Snapchat Pixel', testSrc: (s) => /sc-static\.net\/scevent/i.test(s) },
    { id: 'vwo', name: 'VWO', testSrc: (s) => /dev\.visualwebsiteoptimizer\.com/i.test(s) },
    { id: 'optimizely', name: 'Optimizely', testSrc: (s) => /cdn\.optimizely\.com/i.test(s) },
    { id: 'ab-tasty', name: 'AB Tasty', testSrc: (s) => /abtasty\.com/i.test(s) },
    { id: 'intercom', name: 'Intercom', testSrc: (s) => /intercom\.io|widget\.intercom\.io/i.test(s) },
    { id: 'rudderstack', name: 'RudderStack', testSrc: (s) => /rudderstack\.com|cdn\.rudderlabs\.com/i.test(s) },
    { id: 'posthog', name: 'PostHog', testSrc: (s) => /posthog\.com|app\.posthog\.com|eu\.posthog\.com/i.test(s) },
    { id: 'sentry', name: 'Sentry (browser)', testSrc: (s) => /browser\.sentry-cdn\.com|js\.sentry-cdn\.com/i.test(s) },
    { id: 'cookiebot', name: 'Cookiebot', testSrc: (s) => /consent\.cookiebot\.com|cookiebot\.com/i.test(s) },
    { id: 'onetrust', name: 'OneTrust / CookiePro', testSrc: (s) => /onetrust\.com|cdn\.cookielaw\.org/i.test(s) },
    { id: 'usercentrics', name: 'Usercentrics', testSrc: (s) => /usercentrics\.eu|app\.usercentrics\.eu/i.test(s) },
    { id: 'consentmanager', name: 'Consent Manager (CMP)', testSrc: (s) => /consentmanager\.net/i.test(s) },
    { id: 'iubenda', name: 'iubenda', testSrc: (s) => /iubenda\.com|cdn\.iubenda\.com/i.test(s) },
    { id: 'osano', name: 'Osano', testSrc: (s) => /osano\.com|cmp\.osano\.com/i.test(s) },
    { id: 'didomi', name: 'Didomi', testSrc: (s) => /didomi\.io|sdk\.privacy-center\.org/i.test(s) },
    { id: 'cookieyes', name: 'CookieYes', testSrc: (s) => /cookieyes\.com|cdn-cookieyes\.com/i.test(s) },
    { id: 'borlabs', name: 'Borlabs Cookie', testSrc: (s) => /borlabs\.io/i.test(s) },
    { id: 'complianz', name: 'Complianz', testSrc: (s) => /complianz\.io|complianz\.net/i.test(s) },
    { id: 'klaro', name: 'Klaro!', testSrc: (s) => /klaro\.org|cdn\.kiprotect\.com/i.test(s) },
    { id: 'sourcepoint', name: 'Sourcepoint', testSrc: (s) => /sourcepoint\.com|privacy-mgmt\.com/i.test(s) },
    { id: 'commanders-act', name: 'Commanders Act / TagCommander', testSrc: (s) => /commandersact\.com|tagcommander\.com/i.test(s) },
    { id: 'trustarc', name: 'TrustArc', testSrc: (s) => /trustarc\.com|consent\.trustarc\.com/i.test(s) },
    {
        id: 'quantcast-choice',
        name: 'Quantcast Choice (TCF)',
        testSrc: (s) => /quantcast\.mgr\.consensu\.org|quantcast\.com\/choice/i.test(s),
    },
    { id: 'doubleclick', name: 'Google Marketing / DoubleClick', testSrc: (s) => /doubleclick\.net/i.test(s) },
    { id: 'google-ads', name: 'Google Ads', testSrc: (s) => /googleadservices\.com/i.test(s) },
    { id: 'google-adsense', name: 'Google AdSense / Syndication', testSrc: (s) => /googlesyndication\.com|pagead2\.googlesyndication/i.test(s) },
    { id: 'criteo', name: 'Criteo', testSrc: (s) => /criteo\.com|criteo\.net/i.test(s) },
    { id: 'taboola', name: 'Taboola', testSrc: (s) => /taboola\.com/i.test(s) },
    { id: 'outbrain', name: 'Outbrain', testSrc: (s) => /outbrain\.com/i.test(s) },
    { id: 'xandr', name: 'Xandr / Microsoft Advertising (AppNexus)', testSrc: (s) => /adnxs\.com|adnxs\.net/i.test(s) },
    { id: 'amazon-ads', name: 'Amazon Ads', testSrc: (s) => /amazon-adsystem\.com/i.test(s) },
    { id: 'thetradedesk', name: 'The Trade Desk', testSrc: (s) => /adsrvr\.org/i.test(s) },
    { id: 'adform', name: 'Adform', testSrc: (s) => /adform\.net/i.test(s) },
    { id: 'scorecard', name: 'Scorecard Research (Comscore)', testSrc: (s) => /scorecardresearch\.com/i.test(s) },
    { id: 'adobe-audience', name: 'Adobe Experience Cloud / Audience', testSrc: (s) => /demdex\.net|everesttech\.net|2o7\.net/i.test(s) },
    { id: 'openx', name: 'OpenX', testSrc: (s) => /openx\.net/i.test(s) },
    { id: 'pubmatic', name: 'PubMatic', testSrc: (s) => /pubmatic\.com/i.test(s) },
    { id: 'rubicon', name: 'Magnite / Rubicon', testSrc: (s) => /rubiconproject\.com/i.test(s) },
    { id: 'triplelift', name: 'TripleLift', testSrc: (s) => /3lift\.com|triplelift\.com/i.test(s) },
    { id: 'mediamath', name: 'MediaMath', testSrc: (s) => /mediamath\.com/i.test(s) },
    { id: 'salesforce-dmp', name: 'Salesforce Audience / Krux', testSrc: (s) => /krxd\.net/i.test(s) },
];

const NETWORK_LABEL = ' (Netzwerk)';

/**
 * Normalize hostname for root matching (lowercase, strip leading `www.`).
 */
export function normalizeHostname(host: string): string {
    let h = host.trim().toLowerCase();
    if (h.startsWith('www.')) h = h.slice(4);
    return h;
}

function isUnderRoot(host: string, root: string): boolean {
    const r = root.trim().toLowerCase();
    return host === r || host.endsWith('.' + r);
}

/**
 * Map third-party request hosts (from the scan network trace) to known tools.
 * Same `id` as {@link TRACKING_RULES} where possible so results dedupe with DOM-based detection.
 */
const THIRD_PARTY_HOST_RULES: Array<{ id: string; name: string; roots: string[] }> = [
    { id: 'gtm', name: 'Google Tag Manager', roots: ['googletagmanager.com'] },
    { id: 'ga4', name: 'Google Analytics (gtag / GA4)', roots: ['google-analytics.com'] },
    { id: 'doubleclick', name: 'Google Marketing / DoubleClick', roots: ['doubleclick.net'] },
    { id: 'google-ads', name: 'Google Ads', roots: ['googleadservices.com'] },
    { id: 'google-adsense', name: 'Google AdSense / Syndication', roots: ['googlesyndication.com', 'pagead2.googlesyndication.com'] },
    { id: 'fb-pixel', name: 'Meta Pixel', roots: ['facebook.net', 'connect.facebook.net'] },
    { id: 'linkedin', name: 'LinkedIn Insight Tag', roots: ['licdn.com', 'ads.linkedin.com'] },
    { id: 'twitter-x', name: 'X (Twitter) Ads', roots: ['ads-twitter.com', 'static.ads-twitter.com'] },
    { id: 'bing-ads', name: 'Microsoft Advertising (UET)', roots: ['bat.bing.com'] },
    { id: 'matomo', name: 'Matomo', roots: ['matomo.cloud', 'matomo.org'] },
    { id: 'plausible', name: 'Plausible', roots: ['plausible.io'] },
    { id: 'hotjar', name: 'Hotjar', roots: ['hotjar.com', 'static.hotjar.com'] },
    { id: 'clarity', name: 'Microsoft Clarity', roots: ['clarity.ms'] },
    { id: 'segment', name: 'Segment', roots: ['segment.com', 'segment.io', 'cdn.segment.com', 'api.segment.io'] },
    { id: 'hubspot', name: 'HubSpot', roots: ['hs-scripts.com', 'hsforms.net', 'hubspot.net', 'hubapi.com'] },
    { id: 'mixpanel', name: 'Mixpanel', roots: ['mixpanel.com', 'mxpnl.com'] },
    { id: 'heap', name: 'Heap', roots: ['heapanalytics.com'] },
    { id: 'fullstory', name: 'FullStory', roots: ['fullstory.com'] },
    { id: 'pardot', name: 'Salesforce Pardot', roots: ['pardot.com', 'pi.pardot.com'] },
    { id: 'tiktok', name: 'TikTok Pixel', roots: ['analytics.tiktok.com', 'ads.tiktok.com'] },
    { id: 'pinterest', name: 'Pinterest Tag', roots: ['ct.pinterest.com', 'analytics.pinterest.com'] },
    { id: 'reddit', name: 'Reddit Pixel', roots: ['redditstatic.com'] },
    { id: 'snapchat', name: 'Snapchat Pixel', roots: ['sc-static.net'] },
    { id: 'vwo', name: 'VWO', roots: ['visualwebsiteoptimizer.com'] },
    { id: 'optimizely', name: 'Optimizely', roots: ['optimizely.com', 'cdn.optimizely.com'] },
    { id: 'ab-tasty', name: 'AB Tasty', roots: ['abtasty.com'] },
    { id: 'intercom', name: 'Intercom', roots: ['intercom.io', 'intercomcdn.com'] },
    { id: 'rudderstack', name: 'RudderStack', roots: ['rudderlabs.com', 'rudderstack.com'] },
    { id: 'posthog', name: 'PostHog', roots: ['posthog.com', 'app.posthog.com', 'eu.posthog.com'] },
    { id: 'sentry', name: 'Sentry (browser)', roots: ['sentry.io', 'sentry-cdn.com'] },
    { id: 'cookiebot', name: 'Cookiebot', roots: ['cookiebot.com', 'consent.cookiebot.com'] },
    { id: 'onetrust', name: 'OneTrust / CookiePro', roots: ['onetrust.com', 'cookielaw.org'] },
    { id: 'usercentrics', name: 'Usercentrics', roots: ['usercentrics.eu'] },
    { id: 'consentmanager', name: 'Consent Manager (CMP)', roots: ['consentmanager.net'] },
    { id: 'iubenda', name: 'iubenda', roots: ['iubenda.com'] },
    { id: 'osano', name: 'Osano', roots: ['osano.com'] },
    { id: 'didomi', name: 'Didomi', roots: ['didomi.io', 'sdk.privacy-center.org'] },
    { id: 'cookieyes', name: 'CookieYes', roots: ['cookieyes.com', 'cdn-cookieyes.com'] },
    { id: 'borlabs', name: 'Borlabs Cookie', roots: ['borlabs.io'] },
    { id: 'complianz', name: 'Complianz', roots: ['complianz.io', 'complianz.net'] },
    { id: 'klaro', name: 'Klaro!', roots: ['klaro.org', 'kiprotect.com'] },
    { id: 'sourcepoint', name: 'Sourcepoint', roots: ['sourcepoint.com', 'privacy-mgmt.com'] },
    { id: 'commanders-act', name: 'Commanders Act / TagCommander', roots: ['commandersact.com', 'tagcommander.com'] },
    { id: 'trustarc', name: 'TrustArc', roots: ['trustarc.com'] },
    {
        id: 'quantcast-choice',
        name: 'Quantcast Choice (TCF)',
        roots: ['quantcast.com', 'quantcast.mgr.consensu.org'],
    },
    { id: 'criteo', name: 'Criteo', roots: ['criteo.com', 'criteo.net'] },
    { id: 'taboola', name: 'Taboola', roots: ['taboola.com', 'taboolasyndication.com'] },
    { id: 'outbrain', name: 'Outbrain', roots: ['outbrain.com'] },
    { id: 'xandr', name: 'Xandr / Microsoft Advertising (AppNexus)', roots: ['adnxs.com', 'adnxs.net'] },
    { id: 'amazon-ads', name: 'Amazon Ads', roots: ['amazon-adsystem.com'] },
    { id: 'thetradedesk', name: 'The Trade Desk', roots: ['adsrvr.org'] },
    { id: 'adform', name: 'Adform', roots: ['adform.net'] },
    { id: 'scorecard', name: 'Scorecard Research (Comscore)', roots: ['scorecardresearch.com'] },
    { id: 'adobe-audience', name: 'Adobe Experience Cloud / Audience', roots: ['demdex.net', 'everesttech.net', '2o7.net'] },
    { id: 'openx', name: 'OpenX', roots: ['openx.net'] },
    { id: 'pubmatic', name: 'PubMatic', roots: ['pubmatic.com'] },
    { id: 'rubicon', name: 'Magnite / Rubicon', roots: ['rubiconproject.com'] },
    { id: 'triplelift', name: 'TripleLift', roots: ['3lift.com', 'triplelift.com'] },
    { id: 'mediamath', name: 'MediaMath', roots: ['mediamath.com'] },
    { id: 'salesforce-dmp', name: 'Salesforce Audience / Krux', roots: ['krxd.net'] },
];

/** Host matches any listed root (subdomain-safe). */
function hostMatchesRoots(hostNorm: string, roots: string[]): boolean {
    for (const root of roots) {
        const r = root.trim().toLowerCase();
        if (!r) continue;
        const rn = normalizeHostname(r);
        if (isUnderRoot(hostNorm, rn)) return true;
    }
    return false;
}

/**
 * Add tools inferred from third-party hostnames (network trace) that were not already found in the DOM.
 * New entries get a {@link NETWORK_LABEL} suffix so the UI can distinguish them.
 */
export function mergeTrackingFromThirdPartyHosts(
    existing: DetectedTrackingTool[],
    hosts: string[]
): DetectedTrackingTool[] {
    const seen = new Set(existing.map((t) => t.id));
    const out: DetectedTrackingTool[] = [...existing];
    if (!hosts?.length) return out;

    const normalizedHosts = hosts.map(normalizeHostname).filter(Boolean);

    for (const rule of THIRD_PARTY_HOST_RULES) {
        if (seen.has(rule.id)) continue;
        const hit = normalizedHosts.some((h) => hostMatchesRoots(h, rule.roots));
        if (hit) {
            seen.add(rule.id);
            out.push({ id: rule.id, name: `${rule.name}${NETWORK_LABEL}` });
        }
    }

    return out;
}

function collectTracking(scriptSrcs: string[], linkHrefs: string[], inline: string): DetectedTrackingTool[] {
    const seen = new Set<string>();
    const out: DetectedTrackingTool[] = [];
    const allUrls = [...scriptSrcs, ...linkHrefs];

    for (const rule of TRACKING_RULES) {
        const hitSrc = allUrls.some((u) => rule.testSrc(u));
        const hitInline = rule.testInline ? rule.testInline(inline) : false;
        if ((hitSrc || hitInline) && !seen.has(rule.id)) {
            seen.add(rule.id);
            out.push({ id: rule.id, name: rule.name });
        }
    }

    // dataLayer alone is weak; only flag if GTM/GA not already matched
    if (!seen.has('gtm') && !seen.has('ga4') && /\bdataLayer\.push\s*\(/.test(inline)) {
        seen.add('datalayer');
        out.push({ id: 'datalayer', name: 'dataLayer (Tag Manager–typisch)' });
    }

    return out;
}

function collectPlatforms(hints: DomInfraHints, haystackLower: string, bundleLower: string): string[] {
    return collectDetectedPlatforms({
        generatorMeta: hints.generatorMeta,
        hasNextData: hints.hasNextData,
        hasWpJsonLink: hints.hasWpJsonLink,
        hasWpContentScript: hints.hasWpContentScript,
        bundleLower,
        haystackLower,
    });
}

function hostingFromHeaders(serverHeader: string | null, xPoweredBy: string | null): { server: string | null; poweredBy: string | null } {
    const server = trimHeader(serverHeader);
    const poweredBy = trimHeader(xPoweredBy);
    return { server, poweredBy };
}

/**
 * Infer platforms, tracking tools, and optional Server / X-Powered-By hints.
 */
export function inferInfraStackAndTracking(input: {
    hints: DomInfraHints | null | undefined;
    serverHeader: string | null | undefined;
    xPoweredBy: string | null | undefined;
}): InfraInferenceResult {
    const hints = input.hints;
    const hostingHints = hostingFromHeaders(
        input.serverHeader ?? null,
        input.xPoweredBy ?? null
    );

    if (!hints) {
        return {
            detectedPlatforms: [],
            detectedTracking: [],
            hostingHints,
        };
    }

    const scriptSrcs = hints.scriptSrcs || [];
    const linkHrefs = hints.linkHrefs || [];
    const imgSrcs = hints.imgSrcs || [];
    const inline = hints.inlineScriptFingerprint || '';
    const bundle = [...scriptSrcs, ...linkHrefs, ...imgSrcs].join('\n');
    const bundleLower = bundle.toLowerCase();
    const haystackLower = (bundle + '\n' + inline).toLowerCase();

    return {
        detectedPlatforms: collectPlatforms(hints, haystackLower, bundleLower),
        detectedTracking: collectTracking(scriptSrcs, linkHrefs, inline),
        hostingHints,
    };
}
