import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('magazine lede + filter cutover', () => {
  it('home magazine drops StatLede and pulse LedeStrip', () => {
    const page = readFileSync(path.join(root, 'app/page.tsx'), 'utf8')
    const home = readFileSync(path.join(root, 'components/home-magazine.tsx'), 'utf8')
    expect(page).toContain('HomeMagazine')
    expect(home).not.toContain('StatLede')
    expect(home).not.toContain('LedeStrip')
    expect(home).not.toContain('Corpus pulse')
  })

  it('project and domain filters use FilterRow + Chip', () => {
    const projects = readFileSync(path.join(root, 'components/project-panels.tsx'), 'utf8')
    const issues = readFileSync(path.join(root, 'components/domain-issues-panel.tsx'), 'utf8')
    const affected = readFileSync(
      path.join(root, 'components/domain-issue-affected-pages.tsx'),
      'utf8',
    )
    for (const src of [projects, issues, affected]) {
      expect(src).toContain('FilterRow')
      expect(src).toContain('Chip')
      expect(src).not.toContain('checkion-domain-filter')
    }
  })
})
