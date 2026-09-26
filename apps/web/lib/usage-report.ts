/**
 * Fire-and-forget usage events to Plexon.
 * Spec: plexon knowledge/usage-tracking.md · checkion seo-dataforseo.md / seo-market-suggest-agent.md
 */
import {
  getPlexonAuthUrl,
  getPlexonServiceSecret,
  isPlexonAuthConfigured,
} from './runtime-config'
import { getPlexonContractHeaders } from './plexon-contract'

export type UsageReportParams = {
  userId: string
  eventType: string
  rawUnits: Record<string, unknown>
  idempotencyKey?: string
}

export type LlmTokenUsage = {
  input_tokens: number
  output_tokens: number
  /** True when usage was estimated (no vendor usage block). */
  estimated?: boolean
  model?: string
}

export function isUsageReportingConfigured(): boolean {
  return isPlexonAuthConfigured()
}

/** Fire-and-forget usage event to Plexon. Never throws. */
export function reportUsage(params: UsageReportParams): void {
  try {
    if (!isPlexonAuthConfigured()) return
    if (!params?.userId || !params?.eventType) return
    const url = `${getPlexonAuthUrl().replace(/\/$/, '')}/api/services/usage/events`
    const body = {
      user_id: params.userId,
      service: 'checkion' as const,
      event_type: params.eventType,
      raw_units: params.rawUnits ?? {},
      ...(params.idempotencyKey ? { idempotency_key: params.idempotencyKey } : {}),
    }
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(getPlexonServiceSecret()),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    }).catch((e) => {
      console.warn('[CHECKION] usage report failed:', e?.message ?? e)
    })
  } catch (e) {
    console.warn('[CHECKION] usage report setup failed:', e instanceof Error ? e.message : e)
  }
}

/** Prefer vendor usage; otherwise rough char/4 estimate (marked estimated). */
export function parseOpenRouterUsage(
  json: unknown,
  fallback?: { system?: string; user?: string; content?: string; model?: string },
): LlmTokenUsage {
  const root = json && typeof json === 'object' ? (json as Record<string, unknown>) : null
  const usage = root?.usage && typeof root.usage === 'object' ? (root.usage as Record<string, unknown>) : null
  const prompt =
    typeof usage?.prompt_tokens === 'number'
      ? usage.prompt_tokens
      : typeof usage?.input_tokens === 'number'
        ? usage.input_tokens
        : null
  const completion =
    typeof usage?.completion_tokens === 'number'
      ? usage.completion_tokens
      : typeof usage?.output_tokens === 'number'
        ? usage.output_tokens
        : null
  const model =
    (typeof root?.model === 'string' ? root.model : null) ||
    fallback?.model ||
    undefined

  if (prompt != null || completion != null) {
    return {
      input_tokens: Math.max(0, Math.floor(prompt ?? 0)),
      output_tokens: Math.max(0, Math.floor(completion ?? 0)),
      model,
    }
  }

  const inChars = (fallback?.system?.length ?? 0) + (fallback?.user?.length ?? 0)
  const outChars = fallback?.content?.length ?? 0
  return {
    input_tokens: Math.max(1, Math.ceil(inChars / 4)),
    output_tokens: Math.max(1, Math.ceil(outChars / 4) || 1),
    estimated: true,
    model,
  }
}

export function addLlmUsage(a: LlmTokenUsage, b: LlmTokenUsage): LlmTokenUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    estimated: Boolean(a.estimated || b.estimated),
    model: b.model || a.model,
  }
}

export function reportLlmUsage(input: {
  userId: string | null | undefined
  usage: LlmTokenUsage
  surface?: string
  idempotencyKey?: string
}): void {
  if (!input.userId) return
  if (input.usage.input_tokens <= 0 && input.usage.output_tokens <= 0) return
  reportUsage({
    userId: input.userId,
    eventType: 'llm_request',
    rawUnits: {
      input_tokens: input.usage.input_tokens,
      output_tokens: input.usage.output_tokens,
      ...(input.usage.estimated ? { estimated: true } : {}),
      ...(input.usage.model ? { model: input.usage.model } : {}),
      ...(input.surface ? { surface: input.surface } : {}),
      product: 'seo_market_suggest',
    },
    idempotencyKey: input.idempotencyKey,
  })
}

/** DataForSEO vendor USD → Plexon (conversion lives in Plexon tokensFromEvent). */
export function reportSeoDataForSeoUsage(input: {
  userId: string | null | undefined
  costUsd: number
  endpoint: string
  projectId?: string
  softCapUnits?: number
  idempotencyKey?: string
}): void {
  if (!input.userId) return
  const cost = Number(input.costUsd)
  if (!Number.isFinite(cost) || cost < 0) return
  reportUsage({
    userId: input.userId,
    eventType: 'seo_dataforseo',
    rawUnits: {
      cost_usd: cost,
      endpoint: input.endpoint,
      ...(input.projectId ? { project_id: input.projectId } : {}),
      ...(typeof input.softCapUnits === 'number' ? { soft_cap_units: input.softCapUnits } : {}),
    },
    idempotencyKey: input.idempotencyKey,
  })
}
