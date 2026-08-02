/**
 * GEO two-axis scoring: Auffindbarkeit (discoverability) vs. Wiederverwertbarkeit (repurposing).
 * Deterministic 0–100 per axis; combined headline score is a weighted blend.
 */

import type {
    GenerativeDiscoverabilitySignals,
    GenerativeGeoDimensions,
    GenerativeRepurposingSignals,
} from '@/lib/scan/types';

export interface GeoDimensionFactor {
    factor: string;
    points: number;
}

export interface GeoDimensionsScoreInput {
    hasRobotsAllowingAI: boolean;
    hasLlmsTxt: boolean;
    metaRobotsIndexable: boolean;
    recommendedSchemaTypesFound: string[];
    robotsTxtPresent?: boolean;
    sitemapUrlPresent?: boolean;
    jsonLdErrors?: string[];
    llmsTxtRobotsConsistencyWarnings?: string[];
    /** DOM + JSON-LD extraction (page.evaluate) */
    repurposing: GenerativeRepurposingSignals;
    tableCount: number;
    faqDomCount: number;
    listDensity: number;
    citationCount: number;
    citationsWithLinks?: number;
    hasAuthorBio: boolean;
    articleSchemaQuality?: { hasDatePublished: boolean; hasDateModified: boolean; hasAuthor: boolean };
    structuredDataRequiredFields?: Array<{ type: string; missing: string[] }>;
    jsonLdRichResultGaps?: Array<{ schemaType: string; missing: string[] }>;
    eeat?: {
        hasImpressum: boolean;
        hasContact: boolean;
        hasAboutLink: boolean;
        hasTeamLink?: boolean;
        hasCaseStudyMention?: boolean;
    };
    /** Stricter repurposing when true */
    isYmyl?: boolean;
}

export interface GeoDimensionsScoreResult {
    dimensions: GenerativeGeoDimensions;
    score: number;
    discoverabilitySignals: GenerativeDiscoverabilitySignals;
    repurposingSignals: GenerativeRepurposingSignals;
    dimensionBreakdown: {
        discoverability: GeoDimensionFactor[];
        repurposing: GeoDimensionFactor[];
    };
    /** Short lines for legacy tooltip: headline + both axes */
    scoreBreakdown: GeoDimensionFactor[];
}

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

function roundScore(n: number): number {
    return Math.round(clamp(n, 0, 100));
}

/**
 * Weighted blend: discoverability slightly dominant for "being found".
 */
const W_DISCOVER = 0.52;
const W_REPURPOSE = 0.48;

export function computeGeoDimensionsScore(input: GeoDimensionsScoreInput): GeoDimensionsScoreResult {
    const {
        hasRobotsAllowingAI,
        hasLlmsTxt,
        metaRobotsIndexable,
        recommendedSchemaTypesFound,
        robotsTxtPresent,
        sitemapUrlPresent,
        jsonLdErrors = [],
        llmsTxtRobotsConsistencyWarnings = [],
        repurposing,
        tableCount,
        faqDomCount,
        listDensity,
        citationCount,
        citationsWithLinks = 0,
        hasAuthorBio,
        articleSchemaQuality,
        structuredDataRequiredFields,
        jsonLdRichResultGaps,
        eeat,
        isYmyl,
    } = input;

    const disc: GeoDimensionFactor[] = [];
    const rep: GeoDimensionFactor[] = [];

    const addD = (factor: string, points: number) => {
        disc.push({ factor, points: Math.round(points * 10) / 10 });
    };
    const addR = (factor: string, points: number) => {
        rep.push({ factor, points: Math.round(points * 10) / 10 });
    };

    // ─── Discoverability (max 100) ─────────────────────────────────────────
    addD('KI-Bots (robots.txt)', hasRobotsAllowingAI ? 22 : 0);
    addD('llms.txt', hasLlmsTxt ? 15 : 0);
    addD('Indexierbarkeit (meta)', metaRobotsIndexable ? 20 : 0);
    addD('Empfohlene Schema-Typen', recommendedSchemaTypesFound.length > 0 ? 13 : 0);
    addD('robots.txt vorhanden', robotsTxtPresent ? 6 : 0);
    addD('Sitemap in robots.txt', sitemapUrlPresent ? 8 : 0);

    const errN = jsonLdErrors.length;
    const jsonLdCleanPts =
        errN === 0 ? 8 : errN === 1 ? 5 : errN === 2 ? 2 : 0;
    addD('JSON-L-D parsbar', jsonLdCleanPts);

    const warnN = llmsTxtRobotsConsistencyWarnings.length;
    const consistencyPts = warnN === 0 ? 8 : warnN === 1 ? 3 : 0;
    addD('llms.txt ↔ robots konsistent', consistencyPts);

    let discoverabilitySum = disc.reduce((s, x) => s + x.points, 0);
    discoverabilitySum = clamp(discoverabilitySum, 0, 100);

    // ─── Repurposing (target max ~100 before YMYL) ─────────────────────────
    addR('FAQPage-Schema', repurposing.hasFaqPageSchema ? 12 : 0);
    addR('HowTo-Schema / Schritte', repurposing.hasHowToSchema && (repurposing.howToStepCount ?? 0) > 0 ? 12 : 0);
    const art = articleSchemaQuality;
    const articlePts =
        art && art.hasDatePublished && art.hasAuthor
            ? 10
            : art && (art.hasDatePublished || art.hasAuthor)
              ? 5
              : 0;
    addR('Article/NewsArticle (Datum/Autor)', articlePts);

    addR('BreadcrumbList', repurposing.hasBreadcrumbList ? 4 : 0);
    addR('Organization/WebSite', repurposing.organizationOrWebSiteWithTrust ? 3 : 0);
    addR('sameAs / Logo (Schema)', repurposing.hasSameAsOrLogo ? 3 : 0);

    const gapN =
        (structuredDataRequiredFields?.length ?? 0) + (jsonLdRichResultGaps?.length ?? 0);
    addR(
        'Pflichtfelder / Rich-Result-Lücken',
        gapN === 0 ? 6 : -Math.min(12, gapN * 2)
    );

    addR('Tabellen', tableCount > 0 ? 5 : 0);
    addR('Listen (Dichte)', listDensity >= 0.08 ? 6 : listDensity >= 0.03 ? 3 : 0);
    addR('FAQ-Bausteine (DOM)', faqDomCount > 0 ? 5 : 0);
    addR('Zitate / Quellenanker', citationCount > 5 ? 7 : citationsWithLinks > 0 ? 4 : citationCount > 0 ? 2 : 0);
    addR('Autoren-Bio', hasAuthorBio ? 7 : 0);

    addR('Überschriften (H2)', (repurposing.headingH2Count ?? 0) >= 2 ? 4 : (repurposing.headingH2Count ?? 0) >= 1 ? 2 : 0);
    addR('Genau ein H1', repurposing.hasSingleH1 ? 3 : 0);
    const ratio = repurposing.mainContentWordRatio;
    addR('Hauptinhalt (main-Anteil)', ratio != null && ratio >= 0.35 ? 4 : ratio != null && ratio >= 0.2 ? 2 : 0);
    addR('Definitionslisten (dl)', (repurposing.definitionListPairCount ?? 0) > 0 ? 3 : 0);

    addR('Impressum', eeat?.hasImpressum ? 3 : 0);
    addR('Kontakt', eeat?.hasContact ? 3 : 0);
    addR('Über uns', eeat?.hasAboutLink ? 3 : 0);
    addR('Team / Case Study', eeat?.hasTeamLink || eeat?.hasCaseStudyMention ? 2 : 0);

    let repurposingSum = rep.reduce((s, x) => s + x.points, 0);
    if (isYmyl) {
        const trustPen =
            (!hasAuthorBio ? 8 : 0) + (citationCount < 3 && citationsWithLinks === 0 ? 7 : 0);
        if (trustPen > 0) {
            const applied = Math.min(trustPen, repurposingSum);
            repurposingSum = clamp(repurposingSum - applied, 0, 100);
            rep.push({ factor: 'YMYL: E-E-A-T / Quellen', points: -applied });
        }
    }
    repurposingSum = clamp(repurposingSum, 0, 100);

    const discoverabilitySignals: GenerativeDiscoverabilitySignals = {
        robotsTxtPresent,
        sitemapUrlPresent,
        jsonLdErrorCount: errN,
        llmsRobotsWarningCount: warnN,
        recommendedSchemaCount: recommendedSchemaTypesFound.length,
    };

    const repurposingSignals: GenerativeRepurposingSignals = { ...repurposing };

    const dimensions: GenerativeGeoDimensions = {
        discoverability: roundScore(discoverabilitySum),
        repurposing: roundScore(repurposingSum),
    };

    const score = roundScore(W_DISCOVER * discoverabilitySum + W_REPURPOSE * repurposingSum);

    const scoreBreakdown: GeoDimensionFactor[] = [
        { factor: 'Auffindbarkeit (gewichtet)', points: Math.round(W_DISCOVER * discoverabilitySum * 10) / 10 },
        { factor: 'Wiederverwertbarkeit (gewichtet)', points: Math.round(W_REPURPOSE * repurposingSum * 10) / 10 },
        { factor: 'Gesamt GEO', points: score },
    ];

    return {
        dimensions,
        score,
        discoverabilitySignals,
        repurposingSignals,
        dimensionBreakdown: {
            discoverability: disc,
            repurposing: rep,
        },
        scoreBreakdown,
    };
}
