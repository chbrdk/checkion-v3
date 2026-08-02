/**
 * Run LLM stages 2–3 for GEO/E-E-A-T: E-E-A-T scores, GEO fitness.
 */

import OpenAI from 'openai'
import type { EeatLlmScores, GeoEeatIntensiveResult } from '../scan/types'
import { OPENAI_MODEL, getOpenAIKey } from '../llm/config'
import { addOpenAIChatUsage, emptyUsageTotals, type LlmUsageTotals } from '../llm/usage-totals'
import {
  EEAT_SYSTEM_PROMPT,
  GEO_FITNESS_SYSTEM_PROMPT,
  buildEeatUserPrompt,
  buildGeoFitnessUserPrompt,
} from '../llm/geo-eeat-prompts'

function extractJsonFromResponse(content: string): string {
  const trimmed = content.trim()
  const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m)
  if (codeBlock) return codeBlock[1]!.trim()
  const firstBrace = trimmed.indexOf('{')
  if (firstBrace >= 0) {
    let depth = 0
    for (let i = firstBrace; i < trimmed.length; i++) {
      if (trimmed[i] === '{') depth++
      else if (trimmed[i] === '}') {
        depth--
        if (depth === 0) return trimmed.slice(firstBrace, i + 1)
      }
    }
  }
  return trimmed
}

export function parseEeatResponse(content: string): EeatLlmScores | null {
  try {
    const jsonStr = extractJsonFromResponse(content)
    const o = JSON.parse(jsonStr) as Record<string, { score?: number; reasoning?: string }>
    if (!o.trust?.score || !o.experience?.score || !o.expertise?.score) return null
    return {
      trust: {
        score: Math.max(1, Math.min(5, Number(o.trust.score))),
        reasoning: o.trust.reasoning ?? '',
      },
      experience: {
        score: Math.max(1, Math.min(5, Number(o.experience.score))),
        reasoning: o.experience.reasoning ?? '',
      },
      expertise: {
        score: Math.max(1, Math.min(5, Number(o.expertise.score))),
        reasoning: o.expertise.reasoning ?? '',
      },
      authoritativeness: o.authoritativeness
        ? {
            score: Math.max(1, Math.min(5, Number(o.authoritativeness.score))),
            reasoning: o.authoritativeness.reasoning ?? '',
          }
        : undefined,
    }
  } catch {
    return null
  }
}

export function parseGeoFitnessResponse(
  content: string,
): { score: number; reasoning: string; missingElements: string[] } | null {
  try {
    const jsonStr = extractJsonFromResponse(content)
    const o = JSON.parse(jsonStr) as {
      score?: number
      reasoning?: string
      missingElements?: string[]
    }
    if (typeof o.score !== 'number') return null
    return {
      score: Math.max(0, Math.min(100, o.score)),
      reasoning: o.reasoning ?? '',
      missingElements: Array.isArray(o.missingElements) ? o.missingElements : [],
    }
  } catch {
    return null
  }
}

export type RunLlmStagesResult = {
  payload: GeoEeatIntensiveResult
  usage: LlmUsageTotals
}

export async function runLlmStages(payload: GeoEeatIntensiveResult): Promise<RunLlmStagesResult> {
  const usage = emptyUsageTotals()
  let openai: OpenAI
  try {
    openai = new OpenAI({ apiKey: getOpenAIKey() })
  } catch {
    return { payload, usage }
  }

  const pages = [...(payload.pages ?? [])]
  const model = OPENAI_MODEL

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!
    const technical = page.technical

    try {
      const eeatRes = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: EEAT_SYSTEM_PROMPT },
          {
            role: 'user',
            content: buildEeatUserPrompt({
              url: page.url,
              title: page.title,
              bodyTextExcerpt: page.bodyTextExcerpt,
              hasImpressum: technical?.hasImpressum,
              hasPrivacy: technical?.hasPrivacy,
              hasAboutLink: technical?.eeatSignals?.hasAboutLink,
              hasAuthorBio: technical?.generative?.expertise?.hasAuthorBio,
            }),
          },
        ],
      })
      addOpenAIChatUsage(usage, eeatRes.usage)
      const eeatContent = eeatRes.choices[0]?.message?.content ?? ''
      const eeatScores = eeatContent ? parseEeatResponse(eeatContent) : null
      if (eeatScores) pages[i] = { ...page, eeatScores }
    } catch (e) {
      console.error('[checkion-v3] GEO E-E-A-T LLM error:', e)
    }

    try {
      const geoRes = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: GEO_FITNESS_SYSTEM_PROMPT },
          {
            role: 'user',
            content: buildGeoFitnessUserPrompt({
              url: page.url,
              title: page.title,
              bodyTextExcerpt: page.bodyTextExcerpt,
              hasLlmsTxt: technical?.generative?.technical?.hasLlmsTxt,
              schemaTypes: technical?.generative?.technical?.schemaCoverage,
              faqCount: technical?.generative?.content?.faqCount,
              listDensity: technical?.generative?.content?.listDensity,
              citationDensity: technical?.generative?.content?.citationDensity,
              hasAuthorBio: technical?.generative?.expertise?.hasAuthorBio,
              discoverability: technical?.generative?.dimensions?.discoverability,
              repurposing: technical?.generative?.dimensions?.repurposing,
              repurposingSignals: technical?.generative?.repurposingSignals as
                | Record<string, unknown>
                | undefined,
            }),
          },
        ],
      })
      addOpenAIChatUsage(usage, geoRes.usage)
      const geoContent = geoRes.choices[0]?.message?.content ?? ''
      const geoParsed = geoContent ? parseGeoFitnessResponse(geoContent) : null
      if (geoParsed) {
        pages[i] = {
          ...pages[i]!,
          geoFitnessScore: geoParsed.score,
          geoFitnessReasoning: geoParsed.reasoning,
          missingGeoElements:
            geoParsed.missingElements.length > 0 ? geoParsed.missingElements : undefined,
        }
      }
    } catch (e) {
      console.error('[checkion-v3] GEO fitness LLM error:', e)
    }
  }

  return {
    payload: {
      ...payload,
      pages,
      recommendations: payload.recommendations ?? [],
    },
    usage,
  }
}
