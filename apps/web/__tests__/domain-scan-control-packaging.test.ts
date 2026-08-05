/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(__dirname, '../../..')

describe('domain scan control packaging', () => {
  it('documents control API and screenshot volume', () => {
    const pathsFile = readFileSync(resolve(repoRoot, 'apps/web/lib/paths.ts'), 'utf8')
    expect(pathsFile).toContain('apiDomainScanControl')
    expect(pathsFile).toContain('apiProjectActiveDomainScans')

    const df = readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8')
    expect(df).toContain('SCAN_SCREENSHOTS_PATH')
    expect(df).toContain('VOLUME')

    const spec = readFileSync(resolve(repoRoot, 'specs/domain/scan-modes.md'), 'utf8')
    expect(spec).toContain('Phase 7c')
    expect(spec).toContain('pause')
  })
})
