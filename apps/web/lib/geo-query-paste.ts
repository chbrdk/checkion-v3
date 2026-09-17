/**
 * Smart-paste for GEO launch queries — turn clipboard dumps into prompt rows.
 * See `specs/domain/scan-modes.md` § GEO query list.
 */

import { mergeQuerySuggestions } from './geo-query-suggest'

/** Soft cap so a pasted doc cannot flood the launch form. */
export const GEO_QUERY_PASTE_MAX = 24

const LINE_MARKER =
  /^(?:#{1,6}\s+|[-*+•◦▪▸►]\s+|\(?\d{1,2}[.)]\s+|\d{1,2}\s+|[Qq]\d{1,2}[:.)]\s+|[A-Za-z][.)]\s+)/

/** Strip common list / heading markers from one line. */
export function stripGeoQueryLineMarker(line: string): string {
  let next = line.trim()
  // GEO list chrome often copies "01 Best …" without a dot.
  next = next.replace(/^0?\d{1,2}(?=\s+[^\d])\s+/, '')
  next = next.replace(LINE_MARKER, '')
  return next.trim()
}

/**
 * Parse clipboard text into GEO prompts.
 * Supports newlines, numbered / bulleted lists, and multi-`?` single lines.
 */
export function parsePastedGeoQueries(raw: string): string[] {
  const text = String(raw ?? '').replace(/^\uFEFF/, '').trim()
  if (!text) return []

  let chunks: string[] = []

  if (/\r?\n/.test(text)) {
    chunks = text
      .split(/\r?\n/)
      .map(stripGeoQueryLineMarker)
      .filter(Boolean)
  } else if ((text.match(/\?/g) ?? []).length >= 2) {
    // "Frage eins? Frage zwei?" → two prompts
    chunks = text
      .split(/(?<=\?)\s+/)
      .map(stripGeoQueryLineMarker)
      .filter(Boolean)
  } else {
    chunks = [stripGeoQueryLineMarker(text)].filter(Boolean)
  }

  const seen = new Set<string>()
  const out: string[] = []
  for (const chunk of chunks) {
    const q = chunk.replace(/\s+/g, ' ').trim()
    if (!q) continue
    const key = q.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(q)
    if (out.length >= GEO_QUERY_PASTE_MAX) break
  }
  return out
}

export type ApplyPastedGeoQueriesResult = {
  next: string[]
  added: number
  /** True when clipboard yielded ≥2 prompts (list paste). */
  isList: boolean
}

/**
 * Map pasted prompts onto the current list.
 * Empty / blank-only lists are replaced; otherwise new prompts are merged (deduped).
 */
export function applyPastedGeoQueries(
  existing: string[],
  pastedRaw: string,
): ApplyPastedGeoQueriesResult {
  const pasted = parsePastedGeoQueries(pastedRaw)
  if (pasted.length === 0) {
    return { next: existing, added: 0, isList: false }
  }
  const isList = pasted.length >= 2
  const filled = existing.map((q) => q.trim()).filter(Boolean)
  if (filled.length === 0) {
    return { next: pasted, added: pasted.length, isList }
  }
  if (!isList) {
    // Single prompt while list already has content — append if new.
    const next = mergeQuerySuggestions(filled, pasted)
    return { next, added: next.length - filled.length, isList: false }
  }
  const next = mergeQuerySuggestions(filled, pasted)
  return { next, added: next.length - filled.length, isList: true }
}
