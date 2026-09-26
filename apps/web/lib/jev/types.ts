/** Jev / OpenRouter Decisions types — specs/domain/jev-decisions.md */

export type JevQuestion =
  | { type: 'choice'; options: string[]; description?: string }
  | { type: 'noul'; description?: string }
  | { type: 'score'; levels: number; description?: string }

export type JevQuestions = Record<string, JevQuestion>

export type JevChoiceAnswer = {
  key: string
  probabilities?: Record<string, number>
  confidence?: number
}

export type JevNoulAnswer = {
  probability: number
  confidence?: number
}

export type JevScoreAnswer = {
  score: number
  probabilities?: Record<string, number>
  confidence?: number
}

export type JevDecisionResult = {
  model: string
  choices: Record<string, JevChoiceAnswer>
  nouls: Record<string, JevNoulAnswer>
  scores: Record<string, JevScoreAnswer>
  usage?: { cost?: number; promptTokens?: number }
  latencyMs: number
  raw?: unknown
}

export type JevShadowCompare = {
  useCaseId: string
  baseline: unknown
  jev: unknown | null
  agree: boolean | null
  latencyMs: number | null
  costUsd: number | null
  model: string | null
  error?: string
}
