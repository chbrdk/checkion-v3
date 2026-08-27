import { describe, expect, it } from 'vitest'
import { getStaticProductSwitcherItems, plexonProductsCatalogUrl } from '../lib/platform-product-switcher'

describe('platform-product-switcher', () => {
  it('includes checkion and plexon with staging fallbacks', () => {
    const items = getStaticProductSwitcherItems()
    expect(items.some((item) => item.id === 'checkion')).toBe(true)
    expect(items.some((item) => item.id === 'plexon')).toBe(true)
    expect(items.find((item) => item.id === 'checkion')?.href).toMatch(/^https?:\/\//)
  })

  it('builds plexon products catalog url', () => {
    expect(plexonProductsCatalogUrl()).toMatch(/\/products$/)
  })
})
