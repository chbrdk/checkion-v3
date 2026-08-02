/* ------------------------------------------------------------------ */
/*  CHECKION – Privacy / legal link detection (single + domain scans) */
/* ------------------------------------------------------------------ */

import type { PrivacyAudit } from '@/lib/scan/types';

function normalizeHref(href: string, base: string): string {
    try {
        return new URL(href.trim(), base).href;
    } catch {
        return href;
    }
}

/**
 * Derive {@link PrivacyAudit} from anchor tags and an optional cookie-banner hint from the DOM.
 * Separates privacy policy vs AGB/Terms (previously one “privacyLink” mixed both and missed many sites).
 */
export function buildPrivacyAudit(
    linkRows: Array<{ text: string; href: string }>,
    pageUrl: string,
    hasCookieBannerHeuristic: boolean
): PrivacyAudit {
    const rows = linkRows.map((l) => {
        const href = (l.href || '').trim();
        const abs = normalizeHref(href || '#', pageUrl);
        return {
            textLower: (l.text || '').toLowerCase(),
            absLower: abs.toLowerCase(),
            rawHref: href,
            absHref: abs,
        };
    });

    const looksLikePrivacyPolicy = (textLower: string, absLower: string): boolean => {
        if (
            /\b(datenschutz|privacy|privacy-policy|datenschutzerklärung|datenschutzerklaerung|confidentialit)/i.test(
                textLower
            )
        ) {
            return true;
        }
        if (
            /datenschutz|privacy-policy|\/privacy(\/|$|\?)|\/datenschutz(\/|$|\?)|datenschutzerklaerung|datenschutzerklärung/i.test(
                absLower
            )
        ) {
            return true;
        }
        return false;
    };

    const looksLikeTerms = (textLower: string, absLower: string): boolean => {
        if (
            /\b(agb|terms of service|nutzungsbedingungen|allgemeine geschäftsbedingungen|widerrufsrecht|geschäftsbedingungen|terms\b|conditions)\b/i.test(
                textLower
            )
        ) {
            return true;
        }
        if (
            /\/(agb|terms|nutzungsbedingungen|tos|terms-of-service|terms_and_conditions|allgemeine-geschaeftsbedingungen|widerruf)(\/|$|\?)/i.test(
                absLower
            )
        ) {
            return true;
        }
        return false;
    };

    let privacyBest: (typeof rows)[number] | undefined;
    let termsBest: (typeof rows)[number] | undefined;

    for (const row of rows) {
        if (!privacyBest && looksLikePrivacyPolicy(row.textLower, row.absLower)) privacyBest = row;
        if (!termsBest && looksLikeTerms(row.textLower, row.absLower)) termsBest = row;
        if (privacyBest && termsBest) break;
    }

    return {
        hasPrivacyPolicy: !!privacyBest,
        privacyPolicyUrl: privacyBest ? privacyBest.absHref : null,
        hasCookieBanner: hasCookieBannerHeuristic,
        hasTermsOfService: !!termsBest,
    };
}
