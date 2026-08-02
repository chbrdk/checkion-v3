/* ------------------------------------------------------------------ */
/*  CHECKION – Page index: what is where, how findable (rule-based)   */
/* ------------------------------------------------------------------ */

import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import type { StructureNode, PageIndex, PageIndexRegion, PageIndexRegionType, StructureLink } from './types';

/** Keyword/pattern rules for semantic type (DE + EN). Lowercase match on heading text. */
const SEMANTIC_RULES: Array<{ type: PageIndexRegionType; patterns: RegExp[] }> = [
    { type: 'pricing', patterns: [/preis/i, /pricing/i, /tarife/i, /pläne/i, /plans/i, /kosten/i, /preisübersicht/i] },
    { type: 'faq', patterns: [/faq/i, /fragen/i, /questions/i, /häufig/i, /often asked/i, /hilfe/i] },
    { type: 'contact', patterns: [/kontakt/i, /contact/i, /anfahrt/i, /impressum/i, /reach us/i] },
    { type: 'hero', patterns: [/willkommen/i, /welcome/i, /start/i, /home/i, /^hero$/i] },
    { type: 'product', patterns: [/produkt/i, /product/i, /feature/i, /funktionen/i, /lösung/i, /solution/i] },
    { type: 'team', patterns: [/team/i, /über uns/i, /about us/i, /mitarbeiter/i] },
    { type: 'about', patterns: [/about/i, /über uns/i, /wir/i, /company/i, /unternehmen/i] },
];

/** Landmark tag -> semantic type. */
const LANDMARK_TYPE: Record<string, PageIndexRegionType> = {
    nav: 'nav',
    main: 'main',
    aside: 'aside',
    footer: 'footer',
    header: 'hero',
};

const ABOVE_FOLD_WEIGHT = 1;
const LEVEL_WEIGHT = 0.5;   // (7 - level) * LEVEL_WEIGHT; H1 = 3, H2 = 2.5, ...
const POSITION_DECAY = 0.02; // subtract indexInDocument * POSITION_DECAY so earlier regions score higher

/**
 * Infer semantic type from heading text or landmark tag.
 */
function inferSemanticType(tag: string, headingText: string): PageIndexRegionType | undefined {
    const lower = headingText.trim().toLowerCase();
    if (LANDMARK_TYPE[tag]) return LANDMARK_TYPE[tag];
    for (const { type, patterns } of SEMANTIC_RULES) {
        if (patterns.some((p) => p.test(lower))) return type;
    }
    return undefined;
}

/**
 * Compute findability score (rule-based): above-fold bonus + heading level weight + position decay.
 */
function computeFindabilityScore(aboveFold: boolean, level: number, indexInDocument: number): number {
    let score = aboveFold ? ABOVE_FOLD_WEIGHT : 0;
    if (level >= 1 && level <= 6) {
        score += (7 - level) * LEVEL_WEIGHT;
    } else if (level === 7) {
        score += 0.8; // button: lower than headings, higher than paragraphs
    } else if (level === 8) {
        score += 0.4; // paragraph: lowest, so "only in paragraph" signals optimization potential
    } else {
        score += 2; // landmarks get a fixed boost
    }
    score -= indexInDocument * POSITION_DECAY;
    return Math.max(0, Math.round(score * 100) / 100);
}

/**
 * Build page index from structureMap and viewport height.
 * Each structure node becomes a region with findability and optional semantic type.
 */
export function buildPageIndex(
    structureMap: StructureNode[],
    viewportHeight: number,
    url: string
): PageIndex {
    const regions: PageIndexRegion[] = (structureMap || []).map((node, indexInDocument) => {
        const rect = node.rect;
        const aboveFold = rect != null ? rect.y + rect.height <= viewportHeight : false;
        const level = node.level ?? 0;
        const headingText = (node.text || '').slice(0, 200).trim();
        const findabilityScore = computeFindabilityScore(aboveFold, level, indexInDocument);
        const semanticType = inferSemanticType(node.tag, headingText);
        const textSnippet = node.contentSnippet ?? undefined;
        const links = (node.links?.length ? node.links as StructureLink[] : undefined);

        return {
            id: uuidv4(),
            tag: node.tag,
            headingText,
            level,
            rect,
            indexInDocument,
            aboveFold,
            findabilityScore,
            semanticType,
            ...(textSnippet ? { textSnippet } : {}),
            ...(links?.length ? { links } : {}),
        };
    });

    return {
        url,
        viewportHeight,
        regions,
    };
}

/** Weight for saliency in combined findability: findabilityScore + SALIENCY_WEIGHT * saliencyProminence */
export const SALIENCY_WEIGHT = 0.2;

/**
 * Compute mean saliency (0–1) in a rect from a Jet-colored heatmap RGB buffer.
 * Jet: blue = low, red = high; we use R/255 as prominence.
 */
function meanSaliencyInRect(
    data: Uint8Array,
    imgWidth: number,
    imgHeight: number,
    channels: number,
    rect: { x: number; y: number; width: number; height: number }
): number {
    const x0 = Math.max(0, Math.floor(rect.x));
    const y0 = Math.max(0, Math.floor(rect.y));
    const x1 = Math.min(imgWidth, Math.ceil(rect.x + rect.width));
    const y1 = Math.min(imgHeight, Math.ceil(rect.y + rect.height));
    if (x0 >= x1 || y0 >= y1) return 0;

    let sum = 0;
    let count = 0;
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const i = (y * imgWidth + x) * channels;
            sum += data[i] / 255; // R channel
            count++;
        }
    }
    return count > 0 ? Math.round((sum / count) * 1000) / 1000 : 0;
}

/**
 * Enrich page index with saliency prominence per region using the heatmap image.
 * Heatmap is assumed to be same dimensions as the page/screenshot (rects in same coordinate system).
 * Use after saliency heatmap is available (e.g. in saliency/generate route).
 */
export async function enrichPageIndexWithSaliency(
    pageIndex: PageIndex,
    heatmapDataUrlOrBase64: string
): Promise<PageIndex> {
    let rawBase64 = heatmapDataUrlOrBase64.trim();
    if (rawBase64.startsWith('data:')) {
        const comma = rawBase64.indexOf(',');
        rawBase64 = comma >= 0 ? rawBase64.slice(comma + 1) : '';
    }
    if (!rawBase64) return pageIndex;

    const buf = Buffer.from(rawBase64, 'base64');
    const { data, info } = await sharp(buf)
        .raw()
        .toBuffer({ resolveWithObject: true });
    const { width: imgWidth, height: imgHeight, channels } = info;
    const arr = new Uint8Array(data);

    const regions: PageIndexRegion[] = pageIndex.regions.map((r) => {
        if (!r.rect) return r;
        const saliencyProminence = meanSaliencyInRect(arr, imgWidth, imgHeight, channels, r.rect);
        return { ...r, saliencyProminence };
    });

    return {
        ...pageIndex,
        regions,
    };
}
