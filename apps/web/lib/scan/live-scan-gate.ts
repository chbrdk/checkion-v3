import { isDatabaseConfigured } from '../db/config'
import { paths } from '../paths'

/** Env key for forcing live / fixture scan pipeline. */
export const ENV_CHECKION_LIVE_SCANS = paths.envLiveScans

/**
 * Live Puppeteer/Pa11y path when:
 * - `CHECKION_LIVE_SCANS=1` (force on), or
 * - `DATABASE_URL` is set and the flag is not explicitly off (`0` / `false`).
 *
 * Otherwise synthesize fixture results (local demos / CI without Chromium).
 */
export function shouldRunLiveScans(): boolean {
  const flag = process.env[ENV_CHECKION_LIVE_SCANS]?.trim().toLowerCase()
  if (flag === '0' || flag === 'false' || flag === 'off') return false
  if (flag === '1' || flag === 'true' || flag === 'on') return true
  return isDatabaseConfigured()
}
