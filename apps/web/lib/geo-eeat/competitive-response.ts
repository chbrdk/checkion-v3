/**
 * Competitive answer parsing helpers (structured JSON → citations).
 * Used by OpenAI (json_schema), Anthropic, and Gemini query runs.
 */

export const GEO_COMPETITIVE_ANSWER_TEXT_MAX = 4000

/** Target citation list length for provider-style queries (honest recall panel). */
export const GEO_COMPETITIVE_CITATION_TARGET = 20

export type ParsedCompetitiveResponse = {
  answerText: string
  citations: Array<{ domain: string; position: number }>
}

/** JSON schema for OpenAI Structured Outputs: prose answer + ordered citations. */
export const COMPETITIVE_RESPONSE_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    answer: {
      type: 'string',
      description:
        'Natural language answer in the same language as the user query (2–8 sentences). Cover several realistic options — not a single default favorite.',
    },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description:
              'Public website hostname with a TLD (lowercase, no protocol), e.g. brand.tld — never a bare brand name',
          },
          position: { type: 'integer', description: '1-based order of mention in the answer' },
        },
        required: ['domain', 'position'],
        additionalProperties: false,
      },
      description:
        `Up to ${GEO_COMPETITIVE_CITATION_TARGET} distinct website hostnames in mention order when the query asks for providers or comparisons.`,
    },
  },
  required: ['answer', 'citations'],
  additionalProperties: false,
}

/**
 * Blind competitive probe — no target/competitor domain list.
 * Spec: geo-competitive-presence.md § Competitive LLM prompt honesty
 */
export function buildCompetitiveSystemPrompt(): string {
  const n = GEO_COMPETITIVE_CITATION_TARGET
  return (
    'You answer like a careful shopping advisor for a real user. ' +
    "For the user's query, respond with a JSON object containing:\n" +
    '- "answer": natural language prose (2–8 sentences) in the same language as the query;\n' +
    '- "citations": website hostnames you actually mentioned, in the order they appear in the answer.\n' +
    'Each citation must have "domain" (lowercase hostname WITH a TLD, e.g. brand.tld — never a bare brand name) ' +
    'and "position" (1-based index).\n' +
    'Rules:\n' +
    '- Only cite hosts you would genuinely mention for THIS query; empty citations are fine when nothing fits.\n' +
    '- Do not invent domains. Do not favor any particular brand.\n' +
    `- When the query asks for providers, retailers, or comparisons, aim for a broad panel of up to ${n} ` +
    'distinct real website hosts (fill as many as you can honestly name — typically toward that target when the category is large). ' +
    'Order them by fit to the query — not by fame, habit, or a single regional default. Do not pad with fictional domains.\n' +
    '- Do not put the same familiar chain first across unrelated questions unless it clearly fits best.\n' +
    'If no relevant companies, return {"answer":"…","citations":[]}.'
  )
}

/**
 * Layer 2 — native grounded answer. No JSON host panel.
 * Spec: geo-measurement-layers.md
 */
export function buildGroundedSystemPrompt(): string {
  return (
    'You answer like a careful shopping advisor for a real user. ' +
    'Search the web before answering. Prefer current, citable sources. ' +
    'Write a natural-language answer (2–8 sentences) in the same language as the query. ' +
    'Cover several realistic options — not a single default favorite. ' +
    'Do not favor any particular brand. Do not invent sources. ' +
    'If nothing relevant is found, say so plainly.'
  )
}

function extractHostname(input: string): string {
  const s = input.trim().toLowerCase()
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return s.replace(/^www\./, '').split(/[/?#]/)[0] ?? s
  }
}

/** Hostname with ≥2 labels and a TLD — rejects bare brand names like "möbel martin". */
export function isRegistrableDomainHost(domain: string): boolean {
  const d = extractHostname(domain)
  if (!d || d.includes(' ') || !d.includes('.')) return false
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) {
    return false
  }
  const labels = d.split('.')
  const tld = labels[labels.length - 1]
  return labels.length >= 2 && Boolean(tld && tld.length >= 2)
}

/**
 * Label-aware host / subdomain match.
 * Prevents false hits like citation `martin.de` matching target `moebel-martin.de`
 * (string suffix `.martin.de` is NOT a DNS parent of `moebel-martin.de`).
 */
export function hostEqualsOrSubdomain(host: string, base: string): boolean {
  const h = extractHostname(host)
  const b = extractHostname(base)
  if (!h || !b) return false
  if (h === b) return true
  const hLabels = h.split('.')
  const bLabels = b.split('.')
  if (hLabels.length <= bLabels.length) return false
  return bLabels.every((label, i) => hLabels[hLabels.length - bLabels.length + i] === label)
}

export function citationMatchesTargetHost(
  citationDomain: string,
  targetHost: string,
): boolean {
  if (!isRegistrableDomainHost(citationDomain) || !isRegistrableDomainHost(targetHost)) {
    return false
  }
  const c = extractHostname(citationDomain)
  const t = extractHostname(targetHost)
  return hostEqualsOrSubdomain(c, t) || hostEqualsOrSubdomain(t, c)
}

export function normalizeCompetitiveCitations(
  citations: Array<{ domain?: string; position?: number }>,
): Array<{ domain: string; position: number }> {
  const out: Array<{ domain: string; position: number }> = []
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    if (c?.domain == null || String(c.domain).trim() === '') continue
    const domain = extractHostname(String(c.domain))
    if (!isRegistrableDomainHost(domain)) continue
    out.push({
      domain,
      position:
        typeof c.position === 'number' && c.position >= 1 ? Math.floor(c.position) : out.length + 1,
    })
  }
  // Re-number by retained order so dropped brand-name rows do not leave gaps as "position 1"
  return out.map((c, i) => ({ ...c, position: i + 1 }))
}

export function parseCompetitiveResponse(content: string): ParsedCompetitiveResponse {
  const raw = content?.trim()
  if (!raw) return { answerText: '', citations: [] }
  try {
    const parsed = JSON.parse(raw) as {
      answer?: string
      citations?: Array<{ domain?: string; position?: number }>
    }
    const answerText = String(parsed.answer ?? '')
      .trim()
      .slice(0, GEO_COMPETITIVE_ANSWER_TEXT_MAX)
    const citations = normalizeCompetitiveCitations(parsed.citations ?? [])
    return { answerText, citations }
  } catch {
    return { answerText: '', citations: [] }
  }
}
