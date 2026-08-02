/**
 * Prompts for GEO / E-E-A-T intensive analysis (Stufen 2–3).
 * Output must be valid JSON for parsing.
 */

/** Stufe 2: E-E-A-T scores (1–5) per dimension with reasoning. */
export const EEAT_SYSTEM_PROMPT = `You are an expert in content quality and E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) for web pages and AI/search visibility.

You receive page metadata and a short content excerpt. Rate each E-E-A-T dimension from 1 to 5 (1 = very weak, 5 = very strong) with a brief reasoning (one sentence).

Reply ONLY with a single JSON object. No markdown, no text outside JSON.
Required structure:
{
  "trust": { "score": number (1-5), "reasoning": "string" },
  "experience": { "score": number (1-5), "reasoning": "string" },
  "expertise": { "score": number (1-5), "reasoning": "string" },
  "authoritativeness": { "score": number (1-5), "reasoning": "string" }
}

Consider: Trust = imprint, contact, privacy, transparency. Experience = first-hand content, case studies, "we" / real usage. Expertise = author credentials, citations, depth. Authoritativeness = recognition, citations by others (infer from content if no backlink data).`

export function buildEeatUserPrompt(page: {
  url: string
  title?: string
  bodyTextExcerpt?: string
  hasImpressum?: boolean
  hasPrivacy?: boolean
  hasAboutLink?: boolean
  hasAuthorBio?: boolean
}): string {
  const signals = [
    page.hasImpressum != null && `Impressum/legal: ${page.hasImpressum}`,
    page.hasPrivacy != null && `Privacy policy: ${page.hasPrivacy}`,
    page.hasAboutLink != null && `About link: ${page.hasAboutLink}`,
    page.hasAuthorBio != null && `Author bio: ${page.hasAuthorBio}`,
  ].filter(Boolean)
  return `Page:
- URL: ${page.url}
- Title: ${page.title ?? '(none)'}
- Detected signals: ${signals.length > 0 ? signals.join(', ') : 'none'}
- Content excerpt (first ~1500 chars): ${(page.bodyTextExcerpt ?? '').slice(0, 1500)}

Rate E-E-A-T and reply with the JSON object only.`
}

/** Stufe 3: GEO fitness score 0–100 and missing elements. */
export const GEO_FITNESS_SYSTEM_PROMPT = `You are an expert in Generative Engine Optimization (GEO): how well content is suited to be cited and summarized by AI systems (e.g. ChatGPT, Perplexity, Google AI Overviews).

You receive technical signals (schema, llms.txt, FAQ/list/citation density, author) plus optional deterministic scores for "findability" (discoverability) and "content repurposing" (repurposing) when provided. Use them as hints; still form your own judgment from the excerpt. Rate how well this page is optimized for generative search from 0 to 100, with one sentence reasoning and a short list of missing or weak elements (e.g. "Author", "FAQs", "Structured data").

Reply ONLY with a single JSON object. No markdown, no text outside JSON.
Required structure:
{
  "score": number (0-100),
  "reasoning": "string",
  "missingElements": string[] (e.g. ["Author", "FAQs", "llms.txt"])
}`

export function buildGeoFitnessUserPrompt(page: {
  url: string
  title?: string
  bodyTextExcerpt?: string
  hasLlmsTxt?: boolean
  schemaTypes?: string[]
  faqCount?: number
  listDensity?: number
  citationDensity?: number
  hasAuthorBio?: boolean
  discoverability?: number
  repurposing?: number
  repurposingSignals?: Record<string, unknown>
}): string {
  const dim =
    page.discoverability != null || page.repurposing != null
      ? ` deterministicDimensions: discoverability=${page.discoverability ?? 'n/a'}, repurposing=${page.repurposing ?? 'n/a'}`
      : ''
  const rs =
    page.repurposingSignals && Object.keys(page.repurposingSignals).length > 0
      ? ` repurposingSignals=${JSON.stringify(page.repurposingSignals)}`
      : ''
  return `Page: ${page.url}
Title: ${page.title ?? '(none)'}
Technical: llms.txt=${page.hasLlmsTxt ?? false}, schema types=${JSON.stringify(page.schemaTypes ?? [])}, FAQ count=${page.faqCount ?? 0}, list density=${page.listDensity ?? 0}, citation density=${page.citationDensity ?? 0}, author bio=${page.hasAuthorBio ?? false}${dim}${rs}
Content excerpt: ${(page.bodyTextExcerpt ?? '').slice(0, 1500)}

Rate GEO fitness (0-100) and reply with the JSON object only.`
}
