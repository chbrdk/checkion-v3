/**
 * Heuristic **dwell time** (time-on-page) estimate from crawl metrics — not analytics.
 * Replaces real user data with a reading-time model + light interaction / friction signals.
 */

import type { DwellTimeEstimate, DwellTimeEstimateInput } from '@/lib/scan/types';

export type { DwellTimeEstimateInput } from '@/lib/scan/types';

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

/**
 * Effective reading speed (words/min) on screen — slower for harder text.
 */
export function effectiveWpm(readabilityGradeLevel: number): number {
    const g = Number.isFinite(readabilityGradeLevel) ? readabilityGradeLevel : 10;
    return Math.round(clamp(245 - g * 4.5, 130, 245));
}

/**
 * Best-effort dwell estimate. **Not** session duration from GA — label clearly in UI.
 */
export function estimateDwellTime(input: DwellTimeEstimateInput): DwellTimeEstimate | null {
    const words = Math.max(0, Math.floor(input.bodyWordCount));
    if (words === 0 && input.formFieldCount === 0 && input.videoCount === 0) {
        return null;
    }

    const wpm = effectiveWpm(input.readabilityGradeLevel);
    let readingBase = words > 0 ? (words / wpm) * 60 : 0;

    let archetype: DwellTimeEstimate['factors']['archetype'] = 'mixed';
    if (input.formFieldCount >= 6 || (input.formFieldCount >= 3 && words < 350)) {
        archetype = 'interactive';
    } else if (words < 180 || (input.skinnyContent && words < 300)) {
        archetype = 'thin';
    } else if (words >= 500) {
        archetype = 'content';
    }

    if (archetype === 'thin') {
        readingBase = readingBase * 0.38 + 12;
        readingBase = Math.min(readingBase, 95);
    }

    const scrollVH = Math.max(1, input.scrollHeightOverVh || 1);
    const scrollBonus =
        scrollVH > 5 ? clamp((scrollVH - 4) * 6, 0, 140) : scrollVH > 3 ? (scrollVH - 2) * 4 : 0;

    const interactionBonus =
        clamp(input.formFieldCount * 11, 0, 200) +
        clamp(input.videoCount * 75, 0, 360) +
        clamp(input.audioCount * 45, 0, 180);

    const explorationBonus = clamp(Math.log2(2 + input.internalLinkCount) * 8, 0, 55);
    const frictionPenalty = clamp(input.brokenLinkCount * 9, 0, 50);

    let median = readingBase + scrollBonus + interactionBonus + explorationBonus - frictionPenalty;
    median = clamp(median, archetype === 'thin' ? 8 : 15, 900);

    const spread = 0.28 + (archetype === 'content' ? 0.08 : 0) + (words < 120 ? 0.12 : 0);
    const secondsMin = Math.max(5, Math.round(median * (1 - spread)));
    const secondsMax = Math.round(median * (1 + spread + 0.12));

    let confidence: DwellTimeEstimate['confidence'] = 'medium';
    if (words >= 200) confidence = 'high';
    if (words < 80 && input.formFieldCount < 2) confidence = 'low';

    const summaryDe =
        `Modell-Schätzung (${Math.round(median)} s typisch): Lesedauer (~${wpm} W/min), Seitenlänge, ` +
        `Formular-/Medien-Signale — kein Messwert aus Analytics (nur Crawl-Heuristik).`;

    return {
        model: 'dwell_v1',
        secondsMedian: Math.round(median),
        secondsMin,
        secondsMax,
        confidence,
        summaryDe,
        factors: {
            readingBaseSeconds: Math.round(readingBase),
            wordsPerMinuteUsed: wpm,
            interactionBonusSeconds: Math.round(interactionBonus + explorationBonus),
            frictionPenaltySeconds: Math.round(frictionPenalty),
            scrollBonusSeconds: Math.round(scrollBonus),
            archetype,
        },
    };
}
