import { describe, expect, it } from 'vitest'
import {
  canonicalSuggestUrl,
  parseHtmlSuggestContext,
  urlContextHasSignal,
} from '../lib/seo-market/url-suggest-context'

describe('url-suggest-context', () => {
  it('normalizes domain to https homepage', () => {
    expect(canonicalSuggestUrl('www.Vaillant-Group.com/de')).toBe(
      'https://vaillant-group.com/',
    )
  })

  it('extracts title description h1', () => {
    const ctx = parseHtmlSuggestContext(
      `<!doctype html><html><head>
        <meta property="og:title" content="Acme Pharma Trials"/>
        <meta name="description" content="Oncology trial platforms."/>
      </head><body><h1>Clinical research hub</h1></body></html>`,
      'https://acme.example/',
    )
    expect(ctx.title).toBe('Acme Pharma Trials')
    expect(ctx.description).toBe('Oncology trial platforms.')
    expect(ctx.h1).toBe('Clinical research hub')
    expect(urlContextHasSignal(ctx)).toBe(true)
  })
})
