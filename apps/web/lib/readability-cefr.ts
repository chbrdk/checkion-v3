import type { UxSnapshot } from '@checkion-v3/contracts'

/** CEFR codes used as the magazine readability mark. */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

const CEFR_RE = /^[ABC][12]$/i

/** Flesch-Kincaid US grade-level label → CEFR (CHECKION scanner strings). */
const FLESCH_LABEL_TO_CEFR: Record<string, CefrLevel> = {
  'Easy (6th Grade)': 'A2',
  'Standard (High School)': 'B1',
  'Complex (College)': 'C1',
  'Very Complex (Academic)': 'C2',
  Unknown: 'B2',
}

/**
 * Map Flesch-Kincaid grade level (≈0–20+) to CEFR.
 * Rough band alignment for magazine display — not an official CEFR exam map.
 */
export function fleschGradeLevelToCefr(gradeLevel: number): CefrLevel {
  if (!Number.isFinite(gradeLevel) || gradeLevel < 0) return 'B2'
  if (gradeLevel <= 4) return 'A1'
  if (gradeLevel <= 6) return 'A2'
  if (gradeLevel <= 8) return 'B1'
  if (gradeLevel <= 10) return 'B2'
  if (gradeLevel <= 12) return 'C1'
  return 'C2'
}

/** Invert FK grade level into a 0–100 clarity meter for the reading profile. */
export function fleschGradeLevelToClarity(gradeLevel: number): number {
  if (!Number.isFinite(gradeLevel)) return 50
  return Math.max(5, Math.min(100, Math.round(110 - gradeLevel * 6)))
}

export function isCefrLevel(value: string | null | undefined): value is CefrLevel {
  return Boolean(value && CEFR_RE.test(value.trim()))
}

/**
 * Normalize UX readability for magazine UI:
 * - `readabilityGrade` → CEFR (A1–C2)
 * - `readabilityScore` → clarity 0–100 (not raw FK grade level)
 */
export function normalizeUxReadability(ux: UxSnapshot): UxSnapshot {
  const rawGrade = (ux.readabilityGrade || '').trim()
  const rawScore = ux.readabilityScore

  const alreadyCefr = isCefrLevel(rawGrade)
  const scoreLooksLikeFkLevel =
    rawScore != null && Number.isFinite(rawScore) && rawScore >= 0 && rawScore <= 25
  const scoreLooksLikeClarity =
    rawScore != null && Number.isFinite(rawScore) && rawScore > 25 && rawScore <= 100

  let cefr: CefrLevel
  let clarity: number

  if (alreadyCefr && scoreLooksLikeClarity) {
    return ux
  }

  if (scoreLooksLikeFkLevel) {
    cefr = fleschGradeLevelToCefr(rawScore)
    clarity = fleschGradeLevelToClarity(rawScore)
  } else if (FLESCH_LABEL_TO_CEFR[rawGrade]) {
    cefr = FLESCH_LABEL_TO_CEFR[rawGrade]!
    clarity = scoreLooksLikeClarity
      ? Math.round(rawScore!)
      : fleschGradeLevelToClarity(cefrToApproxFkLevel(cefr))
  } else if (alreadyCefr) {
    cefr = rawGrade.toUpperCase() as CefrLevel
    clarity = scoreLooksLikeClarity
      ? Math.round(rawScore!)
      : fleschGradeLevelToClarity(cefrToApproxFkLevel(cefr))
  } else if (scoreLooksLikeClarity) {
    cefr = clarityToCefr(rawScore!)
    clarity = Math.round(rawScore!)
  } else {
    cefr = 'B2'
    clarity = 50
  }

  if (ux.readabilityGrade === cefr && ux.readabilityScore === clarity) return ux
  return { ...ux, readabilityGrade: cefr, readabilityScore: clarity }
}

function cefrToApproxFkLevel(cefr: CefrLevel): number {
  switch (cefr) {
    case 'A1':
      return 3
    case 'A2':
      return 5
    case 'B1':
      return 7
    case 'B2':
      return 9
    case 'C1':
      return 11
    case 'C2':
      return 14
  }
}

function clarityToCefr(clarity: number): CefrLevel {
  if (clarity >= 85) return 'A1'
  if (clarity >= 75) return 'A2'
  if (clarity >= 65) return 'B1'
  if (clarity >= 55) return 'B2'
  if (clarity >= 40) return 'C1'
  return 'C2'
}
