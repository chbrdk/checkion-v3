/**
 * Local screenshot storage for Phase 2 (puppeteer JPEG buffers).
 * S3 support deferred — prefer bundled local disk under SCAN_SCREENSHOTS_PATH.
 */

import fs from 'fs'
import path from 'path'
import { apiScanScreenshot, ENV_SCAN_SCREENSHOTS_PATH } from './constants'

const DEFAULT_DIR = path.join(process.cwd(), 'data', 'screenshots')
const EXT = '.jpg'

function getDir(): string {
  const dir = process.env[ENV_SCAN_SCREENSHOTS_PATH] || DEFAULT_DIR
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
}

function getScreenshotPath(scanId: string): string {
  const dir = getDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  // Keep file names filesystem-safe (DB ids are usually already safe).
  const safeId = scanId.replace(/[^a-zA-Z0-9._-]+/g, '_')
  return path.join(dir, `${safeId}${EXT}`)
}

/** Write screenshot to local disk. Returns a relative URL path for the scan payload. */
export async function writeScreenshot(scanId: string, buffer: Buffer): Promise<string> {
  const filePath = getScreenshotPath(scanId)
  fs.writeFileSync(filePath, buffer)
  return apiScanScreenshot(scanId)
}

export async function readScreenshot(scanId: string): Promise<Buffer | null> {
  const filePath = getScreenshotPath(scanId)
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath)
}

/** Copy an existing capture to a new scan id (reuse / remount). Returns API path or null. */
export async function copyScreenshot(fromScanId: string, toScanId: string): Promise<string | null> {
  const buf = await readScreenshot(fromScanId)
  if (!buf) return null
  return writeScreenshot(toScanId, buf)
}
