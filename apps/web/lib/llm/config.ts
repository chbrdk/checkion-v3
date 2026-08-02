/**
 * LLM config for GEO / E-E-A-T stages.
 * OPENAI_API_KEY is required for live GEO LLM stages.
 */

import { paths } from '../paths'

/** Default for GEO on-page stages and single-model competitive query runs. */
export const OPENAI_MODEL =
  process.env[paths.envOpenAiModel]?.trim() || 'gpt-5.4-nano'

export function getOpenAIKey(): string {
  const key = process.env[paths.envOpenAiApiKey]?.trim()
  if (!key) {
    throw new Error('OPENAI_API_KEY is not set')
  }
  return key
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env[paths.envOpenAiApiKey]?.trim())
}
