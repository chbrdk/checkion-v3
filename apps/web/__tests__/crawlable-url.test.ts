import { describe, expect, it } from 'vitest'
import { isNonHtmlAssetUrl, shouldSkipCrawlUrl } from '@/lib/scan/crawlable-url'

describe('isNonHtmlAssetUrl / shouldSkipCrawlUrl', () => {
  it('skips PDF and image extensions', () => {
    expect(shouldSkipCrawlUrl('https://www.hdi.de/x.pdf')).toBe(true)
    expect(shouldSkipCrawlUrl('https://www.hdi.de/a/b.JPG?dl=1')).toBe(true)
    expect(shouldSkipCrawlUrl('https://cdn.example.com/press/file.zip')).toBe(true)
  })

  it('skips HDI mediaservice and media/pdf paths without relying on extension', () => {
    expect(
      isNonHtmlAssetUrl(
        'https://www.hdi.de/mediaservice/Datei/Presse/2023/PDF_UM_HDI_Cyberkongress.pdf',
      ),
    ).toBe(true)
    expect(isNonHtmlAssetUrl('https://www.hdi.de/media/pdf/20221117_UM_K-Tarif_HDI')).toBe(true)
    expect(
      isNonHtmlAssetUrl(
        'https://www.hdi.de/mediaservice/bilder/HDI.de/%C3%9Cber-Uns/Management/sandra-blome.jpg',
      ),
    ).toBe(true)
  })

  it('keeps normal HTML pages', () => {
    expect(shouldSkipCrawlUrl('https://www.hdi.de/')).toBe(false)
    expect(shouldSkipCrawlUrl('https://www.hdi.de/privatkunden/versicherung')).toBe(false)
    expect(shouldSkipCrawlUrl('https://www.hdi.de/ueber-uns')).toBe(false)
  })

  it('skips Vaillant media downloads', () => {
    expect(
      shouldSkipCrawlUrl(
        'https://www.vaillant-group.com/newsroom/media-downloads/150-jahre-vaillant/1874_johann_vaillant.jpg',
      ),
    ).toBe(true)
  })
})
