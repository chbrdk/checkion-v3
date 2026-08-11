/**
 * Competitive answer parsing helpers (structured JSON → citations).
 * Used by OpenAI (json_schema), Anthropic, and Gemini query runs.
 */

export const GEO_COMPETITIVE_ANSWER_TEXT_MAX = 4000

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
        'Natural language answer in the same language as the user query (2–6 sentences). Describe options a shopper would realistically hear — not a single default favorite.',
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
        'Website hostnames mentioned in the answer, in mention order. Prefer several varied options when the query asks for providers.',
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
  return (
    'You answer like a careful shopping advisor for a real user. ' +
    "For the user's query, respond with a JSON object containing:\n" +
    '- "answer": natural language prose (2–6 sentences) in the same language as the query;\n' +
    '- "citations": website hostnames you actually mentioned, in the order they appear in the answer.\n' +
    'Each citation must have "domain" (lowercase hostname WITH a TLD, e.g. brand.tld — never a bare brand name) ' +
    'and "position" (1-based index).\n' +
    'Rules:\n' +
    '- Only cite hosts you would genuinely mention for THIS query; empty citations are fine.\n' +
    '- Do not invent domains. Do not favor any particular brand.\n' +
    '- When the query asks for several providers, mention multiple distinct options (typically 3–5) ' +
    'and order them by fit to the query — not by fame, habit, or a single regional default.\n' +
    '- Do not put the same familiar chain first across unrelated questions unless it clearly fits best.\n' +
    'If no relevant companies, return {"answer":"…","citations":[]}.'
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
