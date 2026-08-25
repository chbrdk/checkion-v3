/**
 * Resolve axe-core browser bundle for Puppeteer injection.
 * Never use webpack `require.resolve('axe-core')` as `{ path }` — in Next bundles
 * that returns a numeric module id and crashes fs with ERR_INVALID_ARG_TYPE.
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

function candidatePaths(): string[] {
  const cwd = process.cwd()
  const out: string[] = [
    path.join(cwd, 'node_modules', 'axe-core', 'axe.min.js'),
    path.join(cwd, 'apps', 'web', 'node_modules', 'axe-core', 'axe.min.js'),
  ]
  try {
    const req = createRequire(__filename)
    const pkgJson = req.resolve('axe-core/package.json')
    out.unshift(path.join(path.dirname(pkgJson), 'axe.min.js'))
  } catch {
    // package not resolvable from this compile unit
  }
  return out
}

/** Absolute path to axe.min.js, or null when unavailable. */
export function resolveAxeMinJsPath(): string | null {
  for (const candidate of candidatePaths()) {
    if (typeof candidate === 'string' && candidate.length > 0 && fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

/** Browser source for `page.addScriptTag({ content })`. */
export function readAxeMinJsSource(): string | null {
  const filePath = resolveAxeMinJsPath()
  if (!filePath) return null
  return fs.readFileSync(filePath, 'utf8')
}
