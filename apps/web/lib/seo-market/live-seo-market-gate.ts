import { isDatabaseConfigured } from '../db/config'
import { paths } from '../paths'

export const ENV_CHECKION_LIVE_SEO_MARKET = paths.envLiveSeoMarket

/**
 * Live DataForSEO Market when:
 * - `CHECKION_LIVE_SEO_MARKET=1` (force on; still needs key), or
 * - key set + DATABASE_URL and flag not explicitly off.
 *
 * Otherwise fixture synthesize (local demos / CI).
 */
export function shouldRunLiveSeoMarket(): boolean {
  const flag = process.env[ENV_CHECKION_LIVE_SEO_MARKET]?.trim().toLowerCase()
  if (flag === '0' || flag === 'false' || flag === 'off') return false
  const key = process.env[paths.envDataForSeoApiKey]?.trim()
  if (!key) return false
  if (flag === '1' || flag === 'true' || flag === 'on') return true
  return isDatabaseConfigured()
}

export function requireDataForSeoKey(): string {
  const key = process.env[paths.envDataForSeoApiKey]?.trim()
  if (!key) {
    throw new Error('DATAFORSEO_API_KEY is required for live SEO Market')
  }
  return key
}

export function seoMarketDailySoftCap(): number {
  const raw = process.env[paths.envSeoMarketDailySoftCap]?.trim()
  const n = raw ? Number(raw) : paths.seoMarketDailySoftCapDefault
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : paths.seoMarketDailySoftCapDefault
}
