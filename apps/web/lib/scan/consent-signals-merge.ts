import type { ConsentSignals } from '@/lib/scan/types';

export type ConsentPageProbe = {
    tcfApiPresent: boolean;
    cmpDomHints: string[];
    dataLayerPreview: string[];
    inlineGtmOrGtagDetected: boolean;
};

/** Derive Google Consent Mode–style hints from concatenated inline script snippets. */
export function extractConsentModeHintsFromInline(inlineFingerprint: string): string[] {
    const hints: string[] = [];
    const s = inlineFingerprint || '';
    if (/ads_data_redaction/i.test(s)) hints.push('ads_data_redaction');
    if (/url_passthrough/i.test(s)) hints.push('url_passthrough');
    if (/wait_for_update/i.test(s)) hints.push('wait_for_update');
    if (/consent\s*:\s*['"]default['"]/i.test(s) || /gtag\s*\(\s*['"]consent['"]/i.test(s)) hints.push('consent_default_or_update');
    return hints;
}

export function buildConsentSignals(
    probe: ConsentPageProbe,
    consentModeHints: string[],
    earlyThirdPartyScriptHosts: string[]
): ConsentSignals | undefined {
    const out: ConsentSignals = {
        tcfApiPresent: probe.tcfApiPresent,
        cmpDomHints: probe.cmpDomHints.length > 0 ? probe.cmpDomHints : undefined,
        dataLayerPreview: probe.dataLayerPreview.length > 0 ? probe.dataLayerPreview : undefined,
        inlineGtmOrGtagDetected: probe.inlineGtmOrGtagDetected,
        consentModeHints: consentModeHints.length > 0 ? consentModeHints : undefined,
        earlyThirdPartyScriptHosts: earlyThirdPartyScriptHosts.length > 0 ? earlyThirdPartyScriptHosts.slice(0, 40) : undefined,
    };
    if (
        !out.tcfApiPresent &&
        !(out.cmpDomHints && out.cmpDomHints.length) &&
        !(out.dataLayerPreview && out.dataLayerPreview.length) &&
        !out.inlineGtmOrGtagDetected &&
        !(out.consentModeHints && out.consentModeHints.length) &&
        !(out.earlyThirdPartyScriptHosts && out.earlyThirdPartyScriptHosts.length)
    ) {
        return undefined;
    }
    return out;
}
