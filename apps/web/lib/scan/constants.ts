/**
 * Scan-pipeline constants (slim port from CHECKION v2 `lib/constants.ts`).
 * Only values imported by the scan cluster live here.
 */

export const PUPPETEER_PROTOCOL_TIMEOUT_MS = (() => {
  const raw = typeof process !== 'undefined' ? process.env?.PUPPETEER_PROTOCOL_TIMEOUT_MS : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 60_000) return Math.floor(n)
  return 600_000
})()

export const SCAN_NAVIGATION_TIMEOUT_MS = (() => {
  const raw = typeof process !== 'undefined' ? process.env?.SCAN_NAVIGATION_TIMEOUT_MS : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 10_000) return Math.floor(n)
  return 60_000
})()

export const SCAN_EARLY_THIRD_PARTY_SCRIPT_HOST_CAP = (() => {
  const raw =
    typeof process !== 'undefined' ? process.env?.SCAN_EARLY_THIRD_PARTY_SCRIPT_HOST_CAP : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 4 && n <= 200) return Math.floor(n)
  return 40
})()

export const SCAN_GREEN_WEB_FETCH_TIMEOUT_MS = (() => {
  const raw =
    typeof process !== 'undefined' ? process.env?.SCAN_GREEN_WEB_FETCH_TIMEOUT_MS : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 500 && n <= 60_000) return Math.floor(n)
  return 4500
})()

export const SCAN_SCRIPT_RESOURCE_COUNT_CAP = (() => {
  const raw =
    typeof process !== 'undefined' ? process.env?.SCAN_SCRIPT_RESOURCE_COUNT_CAP : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 20 && n <= 10_000) return Math.floor(n)
  return 500
})()

export const SCAN_BOT_CHALLENGE_WAIT_MS = (() => {
  const raw = typeof process !== 'undefined' ? process.env?.SCAN_BOT_CHALLENGE_WAIT_MS : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 5_000 && n <= 120_000) return Math.floor(n)
  return 45_000
})()

export const SCAN_HOST_MIN_DELAY_MS = (() => {
  const raw = typeof process !== 'undefined' ? process.env?.SCAN_HOST_MIN_DELAY_MS : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 0 && n <= 60_000) return Math.floor(n)
  return 2_000
})()

export const SCAN_NAVIGATION_MAX_RETRIES = (() => {
  const raw = typeof process !== 'undefined' ? process.env?.SCAN_NAVIGATION_MAX_RETRIES : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 1 && n <= 8) return Math.floor(n)
  return 4
})()

export const SCAN_NAVIGATION_RETRY_BASE_MS = (() => {
  const raw =
    typeof process !== 'undefined' ? process.env?.SCAN_NAVIGATION_RETRY_BASE_MS : undefined
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  if (Number.isFinite(n) && n >= 500 && n <= 120_000) return Math.floor(n)
  return 5_000
})()

export const ENV_CHECKION_SCAN_DEBUG = 'CHECKION_SCAN_DEBUG'
export const ENV_CHECKION_SCAN_TIMING_LOG = 'CHECKION_SCAN_TIMING_LOG'
export const ENV_SCAN_SCREENSHOTS_PATH = 'SCAN_SCREENSHOTS_PATH'
export const ENV_SCREENSHOT_STORAGE = 'SCREENSHOT_STORAGE'
export const ENV_SCREENSHOT_S3_BUCKET = 'SCREENSHOT_S3_BUCKET'
export const ENV_SCREENSHOT_S3_PREFIX = 'SCREENSHOT_S3_PREFIX'
export const ENV_SCREENSHOT_AWS_REGION = 'SCREENSHOT_AWS_REGION'

/** Local screenshot API path (Phase 2 — no separate screenshot route required for persist). */
export const apiScanScreenshot = (id: string) => `/api/scans/${encodeURIComponent(id)}/screenshot`
