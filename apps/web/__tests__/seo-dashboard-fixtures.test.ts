import { describe, expect, it } from 'vitest'
import { fixtureSeoDashboard } from '../lib/seo-market/dashboard-fixtures'

describe('seo dashboard fixtures', () => {
  it('builds OpenSEO-shaped cards with data-first ordering inputs', () => {
    const model = fixtureSeoDashboard({ projectName: 'Test Co', domain: 'test.co' })
    expect(model.projectName).toBe('Test Co')
    expect(model.setupSteps.some((s) => s.status === 'todo')).toBe(true)
    expect(model.cards.find((c) => c.key === 'gsc')?.stats?.length).toBe(4)
    expect(model.cards.find((c) => c.key === 'backlinks')?.hasData).toBe(true)
    expect(model.cards.find((c) => c.key === 'competitors')?.hasData).toBe(true)
    expect(model.cards.find((c) => c.key === 'competitors')?.stats?.length).toBe(4)
  })
})
