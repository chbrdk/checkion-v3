import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { toLabTileTone } from '../lib/lab-tile-tone'

const repoRoot = path.resolve(__dirname, '../../..')

describe('LabTile migration (local)', () => {
  it('maps score bands onto LabTile tones', () => {
    expect(toLabTileTone('pos')).toBe('pos')
    expect(toLabTileTone('mid')).toBe('low')
    expect(toLabTileTone('default')).toBe('neutral')
  })

  it('result panels and domain overview use LabTileStrip', () => {
    for (const rel of [
      'apps/web/components/result-panels.tsx',
      'apps/web/components/domain-overview-panel.tsx',
      'apps/web/components/geo-overview-panel.tsx',
    ]) {
      const src = readFileSync(path.join(repoRoot, rel), 'utf8')
      expect(src).toContain('LabTile')
      expect(src).not.toContain('checkion-lab-tile')
    }
  })

  it('barrel exports LabTile', () => {
    const barrel = readFileSync(path.join(repoRoot, 'apps/web/lib/msqdx-ui.ts'), 'utf8')
    expect(barrel).toContain("from '../../../../msqdx-ui/packages/ui/src/components/LabTile'")
  })
})
