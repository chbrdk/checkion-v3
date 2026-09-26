import { isDatabaseConfigured } from '../db/config'
import { paths } from '../paths'
import { scheduleJevShadow } from '@/lib/jev/schedule'
import type { JevQuestions } from '@/lib/jev/types'

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
  let result = false
  if (flag === '0' || flag === 'false' || flag === 'off') result = false
  else if (flag === '1' || flag === 'true' || flag === 'on') result = true
  else result = isDatabaseConfigured()

  const questions: JevQuestions = {
    run_live: {
      type: 'noul',
      description: 'Should live GEO LLM pipeline run for this job?',
    },
  }
  scheduleJevShadow({
    useCaseId: 'checkion.live_geo_gate',
    state: { flag: flag ?? null, db: isDatabaseConfigured() },
    questions,
    baseline: result,
    extractNoulKey: 'run_live',
  })
  return result
}

export function requireOpenAiKeyForLiveGeo(): string {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error('OPENAI_API_KEY is required for live GEO LLM stages')
  }
  return key
}
