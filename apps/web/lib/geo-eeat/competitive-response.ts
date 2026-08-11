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
        'Natural language answer in the same language as the user query (2–6 sentences). Explain which companies or domains you recommend and why.',
    },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'Normalized domain or company name (lowercase, no protocol)',
          },
          position: { type: 'integer', description: '1-based order of mention' },
        },
        required: ['domain', 'position'],
        additionalProperties: false,
      },
      description: 'Companies/domains recommended in answer order',
    },
  },
  required: ['answer', 'citations'],
  additionalProperties: false,
}

/**
 * Blind competitive probe — no target/competitor domain list (avoids steered hits).
 * Still asks for natural ordered citations so placement remains measurable.
 * Spec: geo-competitive-presence.md § Competitive LLM prompt honesty
 */
export function buildCompetitiveSystemPrompt(): string {
  return (
    'You are a helpful search assistant answering as you would for a real user researching this topic. ' +
    "For the user's query, respond with a JSON object containing:\n" +
    '- "answer": natural language prose (2–6 sentences) in the same language as the query;\n' +
    '- "citations": an array of recommended companies/domains in order of relevance.\n' +
    'Each citation must have "domain" (lowercase, no protocol, e.g. brand.tld) and "position" (1-based index). ' +
    'Only cite companies you would genuinely recommend for this query — do not invent brands to fill the list, ' +
    'and do not favor any particular brand. Empty citations are fine when you have no real recommendations. ' +
    'If no relevant companies or domains, return {"answer":"…","citations":[]}.'
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

export function normalizeCompetitiveCitations(
  citations: Array<{ domain?: string; position?: number }>,
): Array<{ domain: string; position: number }> {
  return citations
    .filter((c) => c.domain != null && String(c.domain).trim() !== '')
    .map((c, i) => ({
      domain: extractHostname(String(c.domain)),
      position:
        typeof c.position === 'number' && c.position >= 1 ? Math.floor(c.position) : i + 1,
    }))
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
