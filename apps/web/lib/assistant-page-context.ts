/**
 * Assistant host page context — mirrors plexon-v3/specs/domain/assistant-page-context.md
 */

import { paths } from './paths'
import { isRealPlatformProjectId } from './plexon-platform-id'

/** Page-scan result workspace (Wave 1 Collection + soft entity publish). */
export const ASSISTANT_ENTITY_PAGE_SCAN = 'page_scan' as const

/** Domain-scan result workspace. */
export const ASSISTANT_ENTITY_DOMAIN_SCAN = 'domain_scan' as const

/** GEO job detail. */
export const ASSISTANT_ENTITY_GEO_JOB = 'geo_job' as const

export type AssistantPageContext = {
  product: typeof paths.productId
  pathname: string
  capability?: string
  platformProjectId?: string
  entityType?: string
  entityId?: string
  entityUpdatedAt?: string
}

/** Real Plexon Collection UUID only — never `plx-local-*` / product-local ids. */
export function normalizeAssistantPlatformProjectId(
  id: string | null | undefined,
): string | undefined {
  const trimmed = id?.trim()
  if (!trimmed || !isRealPlatformProjectId(trimmed)) return undefined
  return trimmed
}

export function buildCollectionAssistantPageContext(input: {
  pathname: string
  platformProjectId?: string | null
  capability?: string | null
  entityType?: string | null
  entityId?: string | null
}): AssistantPageContext {
  return {
    product: paths.productId,
    pathname: input.pathname.trim() || '/',
    platformProjectId: normalizeAssistantPlatformProjectId(input.platformProjectId),
    capability: input.capability?.trim() || undefined,
    entityType: input.entityType?.trim() || undefined,
    entityId: input.entityId?.trim() || undefined,
  }
}
