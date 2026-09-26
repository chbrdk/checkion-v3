import { describe, expect, it } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { emptySeoChapter } from '../lib/seo-market/chapter-fixtures'
import { emptySeoDashboard } from '../lib/seo-market/dashboard-fixtures'

describe('seoMarket i18n shells', () => {
  it('localizes empty chapter chrome for de and en', () => {
    const tEn = createTranslator('en')
    const tDe = createTranslator('de')
    const en = emptySeoChapter('keywords', { domain: 'acme.example' }, tEn)
    const de = emptySeoChapter('keywords', { domain: 'acme.example' }, tDe)
    expect(en.title).toBe('Keyword research')
    expect(de.title).toBe('Keyword-Research')
    expect(en.searchBand?.actionLabel).toBe('Research')
    expect(de.searchBand?.actionLabel).toBe('Research')
    expect(en.searchBand?.location).toBe('Germany')
    expect(de.searchBand?.location).toBe('Deutschland')
    expect(de.emptyMessage).toMatch(/Seed eingeben/)
  })

  it('localizes empty dashboard setup + cards for de', () => {
    const tDe = createTranslator('de')
    const model = emptySeoDashboard({
      projectName: 'Live',
      domain: 'live.example',
      t: tDe,
    })
    expect(model.setupSteps[0]?.label).toBe('Website bestätigt')
    expect(model.setupSteps[0]?.detail).toContain('live.example')
    const field = model.cards.find((c) => c.key === 'competitors')
    expect(field?.title).toBe('Wettbewerbsfeld')
    expect(field?.emptyCtaLabel).toBe('Feld öffnen')
  })
})
