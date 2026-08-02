/**
 * Type-only stub for UX-check LLM summaries (Phase 3 GEO/UX agent).
 * Avoids a zod dependency on the scan path for Phase 2.
 */

export type UxCheckV2Summary = {
  version: 'ux-check-v2'
  [key: string]: unknown
}
