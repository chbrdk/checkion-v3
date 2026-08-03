import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('magazine Button cutover', () => {
  it('project cover and geo index use Button, not raw ds-btn class strings', () => {
    const projects = readFileSync(path.join(root, 'components/project-panels.tsx'), 'utf8')
    const geo = readFileSync(path.join(root, 'components/geo-index-page.tsx'), 'utf8')
    for (const src of [projects, geo]) {
      expect(src).toContain('<Button')
      expect(src).not.toMatch(/className="ds-btn/)
    }
  })
})
