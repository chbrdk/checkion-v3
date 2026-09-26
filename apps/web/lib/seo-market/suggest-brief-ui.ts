/**
 * Helpers for Market Suggest Phase-3 brief panel.
 * Spec: specs/domain/seo-market-suggest-agent.md § Phase 3
 */
import type { SeoFieldSuggestResult } from '@checkion-v3/contracts'

export type SuggestBriefView = {
  brief: NonNullable<SeoFieldSuggestResult['brief']>
  publishedToPack: boolean | undefined
  publishError: string | undefined
  pagesFetched: number
  usedKnowledge: boolean
}

export function parseSuggestBriefPayload(
  data: Pick<SeoFieldSuggestResult, 'brief' | 'agent'>,
): SuggestBriefView | null {
  const brief = data.brief
  if (!brief || typeof brief.summary !== 'string' || brief.summary.trim().length < 12) {
    return null
  }
  return {
    brief: {
      summary: brief.summary.trim(),
      category: brief.category?.trim() ? brief.category.trim() : null,
      products: Array.isArray(brief.products) ? brief.products.filter(Boolean).slice(0, 12) : [],
      services: Array.isArray(brief.services) ? brief.services.filter(Boolean).slice(0, 12) : [],
      audiences: Array.isArray(brief.audiences)
        ? brief.audiences.filter(Boolean).slice(0, 12)
        : [],
    },
    publishedToPack: data.agent?.publishedToPack,
    publishError:
      typeof data.agent?.publishError === 'string' && data.agent.publishError.trim()
        ? data.agent.publishError.trim()
        : undefined,
    pagesFetched: Array.isArray(data.agent?.pagesFetched) ? data.agent.pagesFetched.length : 0,
    usedKnowledge: Boolean(data.agent?.usedKnowledge),
  }
}

export function topicChips(brief: SuggestBriefView['brief'], max = 8): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [...brief.products, ...brief.services, ...brief.audiences]) {
    const key = raw.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(raw.trim())
    if (out.length >= max) break
  }
  return out
}
