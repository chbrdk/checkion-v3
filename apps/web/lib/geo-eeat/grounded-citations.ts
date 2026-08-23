/**
 * Extract ordered registrable hosts from grounded provider payloads.
 * Spec: specs/domain/geo-measurement-layers.md
 */

import type { GeoCitation } from '@checkion-v3/contracts'
import { GEO_COMPETITIVE_CITATION_TARGET, isRegistrableDomainHost } from './competitive-response'

export type GroundedExtract = {
  answerText: string
  sources: Array<{ url: string; title?: string }>
  searchQueries: string[]
}

function hostnameFromUrlOrHost(input: string): string {
  const s = input.trim().toLowerCase()
  if (!s) return ''
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return s.replace(/^www\./, '').split(/[/?#]/)[0] ?? ''
  }
}

export function citationsFromSourceUrls(
  sources: Array<{ url?: string; title?: string }>,
  cap = GEO_COMPETITIVE_CITATION_TARGET,
): GeoCitation[] {
  const seen = new Set<string>()
  const out: GeoCitation[] = []
  for (const source of sources) {
    const raw = source.url?.trim()
    if (!raw) continue
    const domain = hostnameFromUrlOrHost(raw)
    if (!isRegistrableDomainHost(domain) || seen.has(domain)) continue
    seen.add(domain)
    const abs = raw.startsWith('http') ? raw : `https://${domain}`
    out.push({
      domain,
      position: out.length + 1,
      url: abs,
      ...(source.title?.trim() ? { context: source.title.trim() } : {}),
    })
    if (out.length >= cap) break
  }
  return out
}

function collectStrings(value: unknown, into: string[]): void {
  if (typeof value === 'string' && value.trim()) {
    into.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into)
    return
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>
    for (const key of ['url', 'uri', 'href']) {
      if (typeof rec[key] === 'string') into.push(rec[key] as string)
    }
    if (rec.type === 'url_citation' || rec.type === 'web_search_result_location') {
      if (typeof rec.url === 'string') into.push(rec.url)
    }
    for (const nested of Object.values(rec)) {
      if (nested && typeof nested === 'object') collectStrings(nested, into)
    }
  }
}

function collectSearchQueries(value: unknown, into: string[]): void {
  if (typeof value === 'string' && value.trim()) {
    into.push(value.trim())
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSearchQueries(item, into)
    return
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>
    const type = typeof rec.type === 'string' ? rec.type : ''
    if (
      type === 'web_search_call' ||
      type === 'web_search_tool_result' ||
      type === 'server_tool_use'
    ) {
      if (typeof rec.query === 'string') into.push(rec.query.trim())
      if (Array.isArray(rec.queries)) collectSearchQueries(rec.queries, into)
      if (typeof rec.input === 'object' && rec.input) {
        const input = rec.input as Record<string, unknown>
        if (typeof input.query === 'string') into.push(input.query.trim())
        if (Array.isArray(input.queries)) collectSearchQueries(input.queries, into)
      }
    }
    if (typeof rec.query === 'string' && (type.includes('search') || rec.name === 'web_search')) {
      into.push(rec.query.trim())
    }
    if (Array.isArray(rec.webSearchQueries)) collectSearchQueries(rec.webSearchQueries, into)
    if (Array.isArray(rec.searchQueries)) collectSearchQueries(rec.searchQueries, into)
    for (const nested of Object.values(rec)) {
      if (nested && typeof nested === 'object') collectSearchQueries(nested, into)
    }
  }
}

function uniqueSearchQueries(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const q of raw) {
    const trimmed = q.trim()
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue
    seen.add(trimmed.toLowerCase())
    out.push(trimmed)
  }
  return out
}

function collectOutputText(output: unknown): string {
  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!node) return
    if (typeof node === 'string') {
      parts.push(node)
      return
    }
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (typeof node === 'object') {
      const rec = node as Record<string, unknown>
      if (typeof rec.text === 'string') parts.push(rec.text)
      if (rec.content) walk(rec.content)
      if (rec.output) walk(rec.output)
    }
  }
  walk(output)
  return parts.join('\n').trim()
}

function uniqueUrlSources(
  urls: string[],
  titles: Map<string, string>,
): Array<{ url: string; title?: string }> {
  const seen = new Set<string>()
  const out: Array<{ url: string; title?: string }> = []
  for (const raw of urls) {
    const trimmed = raw.trim()
    if (!trimmed.startsWith('http')) continue
    let host = ''
    try {
      host = new URL(trimmed).hostname.replace(/^www\./, '')
    } catch {
      continue
    }
    if (!host || seen.has(host)) continue
    seen.add(host)
    const title = titles.get(trimmed) ?? titles.get(host)
    out.push(title ? { url: trimmed, title } : { url: trimmed })
  }
  return out
}

function collectCitationTitles(value: unknown, titles: Map<string, string>): void {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => collectCitationTitles(item, titles))
    return
  }
  const rec = value as Record<string, unknown>
  const url =
    typeof rec.url === 'string'
      ? rec.url
      : typeof rec.uri === 'string'
        ? rec.uri
        : rec.web && typeof rec.web === 'object' && typeof (rec.web as { uri?: string }).uri === 'string'
          ? (rec.web as { uri: string }).uri
          : null
  const title =
    typeof rec.title === 'string'
      ? rec.title
      : rec.web && typeof rec.web === 'object' && typeof (rec.web as { title?: string }).title === 'string'
        ? (rec.web as { title: string }).title
        : null
  if (url && title?.trim()) {
    titles.set(url.trim(), title.trim())
    try {
      const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
      if (!titles.has(host)) titles.set(host, title.trim())
    } catch {
      /* ignore */
    }
  }
  for (const nested of Object.values(rec)) {
    if (nested && typeof nested === 'object') collectCitationTitles(nested, titles)
  }
}

/** OpenAI Responses API — url_citation annotations + output_text + web_search_call queries. */
export function extractOpenAiGroundedSources(payload: unknown): GroundedExtract {
  const rec = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const answerText =
    typeof rec.output_text === 'string'
      ? rec.output_text
      : collectOutputText(rec.output)
  const urls: string[] = []
  const queryRaw: string[] = []
  const titles = new Map<string, string>()
  collectStrings(rec.output, urls)
  collectStrings(rec.output_text, urls)
  collectCitationTitles(rec.output, titles)
  collectSearchQueries(rec.output, queryRaw)
  collectSearchQueries(rec, queryRaw)
  return {
    answerText,
    sources: uniqueUrlSources(urls, titles),
    searchQueries: uniqueSearchQueries(queryRaw),
  }
}

/** Anthropic Messages — text blocks + citation urls + search tool queries. */
export function extractAnthropicGroundedSources(payload: unknown): GroundedExtract {
  const rec = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const content = rec.content
  const texts: string[] = []
  const urls: string[] = []
  const queryRaw: string[] = []
  const titles = new Map<string, string>()
  const walk = (node: unknown) => {
    if (!node) return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (typeof node === 'object') {
      const item = node as Record<string, unknown>
      if (item.type === 'text' && typeof item.text === 'string') texts.push(item.text)
      if (item.citations) collectStrings(item.citations, urls)
      collectCitationTitles(item, titles)
      collectSearchQueries(item, queryRaw)
      collectStrings(item, urls)
    }
  }
  walk(content)
  collectSearchQueries(rec, queryRaw)
  return {
    answerText: texts.join('\n').trim(),
    sources: uniqueUrlSources(urls, titles),
    searchQueries: uniqueSearchQueries(queryRaw),
  }
}

/** Gemini generateContent — text parts + groundingChunks.web.uri + webSearchQueries. */
export function extractGeminiGroundedSources(payload: unknown): GroundedExtract {
  const rec = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const candidate = Array.isArray(rec.candidates) ? rec.candidates[0] : undefined
  const cand = candidate && typeof candidate === 'object' ? (candidate as Record<string, unknown>) : {}
  const parts =
    cand.content && typeof cand.content === 'object'
      ? (cand.content as Record<string, unknown>).parts
      : undefined
  const texts: string[] = []
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part && typeof part === 'object' && typeof (part as { text?: string }).text === 'string') {
        texts.push((part as { text: string }).text)
      }
    }
  }
  const urls: string[] = []
  const queryRaw: string[] = []
  const titles = new Map<string, string>()
  collectStrings(cand.groundingMetadata, urls)
  collectStrings(rec.groundingMetadata, urls)
  collectCitationTitles(cand.groundingMetadata, titles)
  collectCitationTitles(rec.groundingMetadata, titles)
  collectSearchQueries(cand.groundingMetadata, queryRaw)
  collectSearchQueries(rec.groundingMetadata, queryRaw)
  return {
    answerText: texts.join('\n').trim(),
    sources: uniqueUrlSources(urls, titles),
    searchQueries: uniqueSearchQueries(queryRaw),
  }
}
