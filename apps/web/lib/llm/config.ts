/**
 * LLM config for GEO / E-E-A-T stages.
 * Live GEO query runs need at least one provider key (OpenAI, Anthropic, or Gemini).
 */

import { paths } from '../paths'

/** Default for GEO on-page stages and single-model competitive query runs. */
export const OPENAI_MODEL =
  process.env[paths.envOpenAiModel]?.trim() || 'gpt-5.6-luna'

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

export function getAnthropicKey(): string {
  const key = process.env[paths.envAnthropicApiKey]?.trim()
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  return key
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env[paths.envAnthropicApiKey]?.trim())
}

export function getGeminiKey(): string {
  const key =
    process.env[paths.envGeminiApiKey]?.trim() ||
    process.env[paths.envGoogleApiKey]?.trim()
  if (!key) {
    throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) is not set')
  }
  return key
}

export function hasGeminiKey(): boolean {
  return Boolean(
    process.env[paths.envGeminiApiKey]?.trim() ||
      process.env[paths.envGoogleApiKey]?.trim(),
  )
}

/** True when any live GEO query-run provider can authenticate. */
export function hasAnyGeoLlmKey(): boolean {
  return hasOpenAIKey() || hasAnthropicKey() || hasGeminiKey()
}
