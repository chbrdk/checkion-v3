/**
 * Extract ordered registrable hosts from grounded provider payloads.
 * Spec: specs/domain/geo-measurement-layers.md
 */

import type { GeoCitation } from '@checkion-v3/contracts'
import { GEO_COMPETITIVE_CITATION_TARGET, isRegistrableDomainHost } from './competitive-response'

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

/** OpenAI Responses API — url_citation annotations + output_text. */
export function extractOpenAiGroundedSources(payload: unknown): {
  answerText: string
  sources: Array<{ url: string; title?: string }>
} {
  const rec = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const answerText =
    typeof rec.output_text === 'string'
      ? rec.output_text
      : collectOutputText(rec.output)
  const urls: string[] = []
  collectStrings(rec.output, urls)
  collectStrings(rec.output_text, urls)
  const sources = uniqueUrlSources(urls)
  return { answerText, sources }
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

/** Anthropic Messages — text blocks + citation urls. */
export function extractAnthropicGroundedSources(payload: unknown): {
  answerText: string
  sources: Array<{ url: string; title?: string }>
} {
  const rec = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const content = rec.content
  const texts: string[] = []
  const urls: string[] = []
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
      collectStrings(item, urls)
    }
  }
  walk(content)
  return { answerText: texts.join('\n').trim(), sources: uniqueUrlSources(urls) }
}

/** Gemini generateContent — text parts + groundingChunks.web.uri */
export function extractGeminiGroundedSources(payload: unknown): {
  answerText: string
  sources: Array<{ url: string; title?: string }>
} {
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
  collectStrings(cand.groundingMetadata, urls)
  collectStrings(rec.groundingMetadata, urls)
  return { answerText: texts.join('\n').trim(), sources: uniqueUrlSources(urls) }
}

function uniqueUrlSources(urls: string[]): Array<{ url: string; title?: string }> {
  const seen = new Set<string>()
  const out: Array<{ url: string }> = []
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
    out.push({ url: trimmed })
  }
  return out
}
