import { describe, expect, it } from 'vitest'
import { resolveSearchMarket, searchUserLocation } from '../lib/geo/search-market'

describe('resolveSearchMarket', () => {
  it('maps .de TLD to DE', () => {
    expect(resolveSearchMarket('https://www.moebel-martin.de/shop')).toEqual({
      country: 'DE',
      timezone: 'Europe/Berlin',
    })
  })

  it('maps .at and .ch TLDs', () => {
    expect(resolveSearchMarket('https://brand.at')).toMatchObject({ country: 'AT' })
    expect(resolveSearchMarket('https://brand.ch')).toMatchObject({ country: 'CH' })
  })

  it('maps .co.uk to GB', () => {
    expect(resolveSearchMarket('https://shop.example.co.uk')).toMatchObject({ country: 'GB' })
  })

  it('falls back to DE for generic .com', () => {
    expect(resolveSearchMarket('https://example.com')).toEqual({
      country: 'DE',
      timezone: 'Europe/Berlin',
    })
  })
})

describe('searchUserLocation', () => {
  it('builds approximate location for provider tools', () => {
    expect(searchUserLocation({ country: 'DE', timezone: 'Europe/Berlin' })).toEqual({
      type: 'approximate',
      country: 'DE',
      timezone: 'Europe/Berlin',
    })
  })
})
