import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../..')

describe('soft lab tiles', () => {
  it('checkion lab tiles use --radius-tile', () => {
    const css = readFileSync(path.join(repoRoot, 'apps/web/app/globals.css'), 'utf8')
    expect(css).toMatch(/\.checkion-lab-tile\s*\{[\s\S]*?border-radius:\s*var\(--radius-tile/)
    expect(css).toMatch(/\.checkion-collection-card\s*\{[\s\S]*?border-radius:\s*var\(--radius-tile/)
  })
})
