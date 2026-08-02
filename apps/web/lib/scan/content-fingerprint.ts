import { createHash } from 'crypto';

const FINGERPRINT_BODY_CHARS = 2000;

/**
 * Stable hash for page content change detection when HTTP cache headers are missing or unreliable.
 */
export function buildContentFingerprint(parts: {
    title?: string | null;
    h1?: string | null;
    bodyTextExcerpt?: string | null;
}): string | undefined {
    const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const title = norm(parts.title);
    const h1 = norm(parts.h1);
    const body = norm(parts.bodyTextExcerpt).slice(0, FINGERPRINT_BODY_CHARS);
    if (!title && !h1 && !body) return undefined;
    const payload = `${title}|${h1}|${body}`;
    return createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 32);
}
