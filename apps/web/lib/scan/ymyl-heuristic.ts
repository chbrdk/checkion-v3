/**
 * YMYL (Your Money Your Life) heuristic for page classification.
 * YMYL pages have stricter E-E-A-T requirements.
 */

const YMYL_KEYWORDS_DE = [
    'invest', 'geld', 'anlage', 'versicherung', 'kredit', 'darlehen', 'rente',
    'steuer', 'finanz', 'kauf', 'rechtsberatung', 'anwalt', 'arzt', 'medizin',
    'gesundheit', 'diagnose', 'behandlung', 'krankheit', 'notfall'
];

const YMYL_KEYWORDS_EN = [
    'invest', 'money', 'insurance', 'credit', 'loan', 'mortgage', 'retirement',
    'tax', 'finance', 'purchase', 'legal advice', 'lawyer', 'doctor', 'medical',
    'health', 'diagnosis', 'treatment', 'disease', 'emergency'
];

const YMYL_PATH_PATTERNS = [
    /\/finanz/i, /\/geld/i, /\/recht/i, /\/anwalt/i, /\/arzt/i, /\/medizin/i,
    /\/gesundheit/i, /\/insurance/i, /\/legal/i, /\/health/i, /\/medical/i,
    /\/invest/i, /\/credit/i, /\/loan/i, /\/kredit/i, /\/kaufen/i, /\/shop/i
];

export interface YmylResult {
    isYmyl: boolean;
    confidence: 'high' | 'medium' | 'low';
    signals: string[];
}

export function detectYmyl(url: string, title: string | null, bodyTextLower: string, metaDesc: string | null): YmylResult {
    const signals: string[] = [];
    let score = 0;

    const combined = [
        url.toLowerCase(),
        (title || '').toLowerCase(),
        (metaDesc || '').toLowerCase(),
        bodyTextLower.slice(0, 3000),
    ].join(' ');

    // URL path
    for (const pat of YMYL_PATH_PATTERNS) {
        if (pat.test(url)) {
            signals.push(`URL-Pfad: ${url}`);
            score += 3;
            break;
        }
    }

    // Keywords
    const keywords = [...YMYL_KEYWORDS_DE, ...YMYL_KEYWORDS_EN];
    for (const kw of keywords) {
        if (combined.includes(kw)) {
            signals.push(`Keyword: ${kw}`);
            score += 1;
            if (score >= 4) break;
        }
    }

    const isYmyl = score >= 2;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (score >= 4) confidence = 'high';
    else if (score >= 2) confidence = 'medium';

    return { isYmyl, confidence, signals: [...new Set(signals)].slice(0, 5) };
}
