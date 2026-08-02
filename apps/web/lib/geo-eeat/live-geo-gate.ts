import { isDatabaseConfigured } from '../db/config'
import { paths } from '../paths'

/** Env key for forcing live / fixture GEO pipeline. */
export const ENV_CHECKION_LIVE_GEO = paths.envLiveGeo

/**
 * Live GEO LLM pipeline when:
 * - `CHECKION_LIVE_GEO=1` (force on), or
 * - `DATABASE_URL` is set and the flag is not explicitly off (`0` / `false`).
 *
 * Otherwise synthesize fixture results (local demos / CI without OpenAI).
 * LLM stages still require `OPENAI_API_KEY` when live is on.
 */
export function shouldRunLiveGeo(): boolean {
  const flag = process.env[ENV_CHECKION_LIVE_GEO]?.trim().toLowerCase()
  if (flag === '0' || flag === 'false' || flag === 'off') return false
  if (flag === '1' || flag === 'true' || flag === 'on') return true
  return isDatabaseConfigured()
}

export function requireOpenAiKeyForLiveGeo(): string {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error('OPENAI_API_KEY is required for live GEO LLM stages')
  }
  return key
}
