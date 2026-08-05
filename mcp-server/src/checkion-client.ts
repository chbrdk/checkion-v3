/**
 * HTTP client for checkion-v3 API. All requests use Bearer token from env.
 */

const BASE_URL = process.env.CHECKION_API_URL ?? ''
const TOKEN = process.env.CHECKION_API_TOKEN ?? ''

export interface CheckionFetchError {
  error: true
  message: string
  status?: number
}

export async function checkionFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T | CheckionFetchError> {
  if (!BASE_URL || !TOKEN) {
    return {
      error: true,
      message: 'CHECKION_API_URL or CHECKION_API_TOKEN not configured',
    }
  }
  const url = path.startsWith('http')
    ? path
    : `${BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const headers: HeadersInit = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  try {
    const res = await fetch(url, { ...options, headers })
    const text = await res.text()
    let data: T
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T)
    } catch {
      return {
        error: true,
        message: res.ok ? text || 'Empty response' : `HTTP ${res.status}: ${text.slice(0, 200)}`,
        status: res.status,
      }
    }
    if (!res.ok) {
      const err = data as { error?: string; message?: string; detail?: string }
      return {
        error: true,
        message: err?.detail ?? err?.error ?? err?.message ?? `HTTP ${res.status}`,
        status: res.status,
      }
    }
    return data
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { error: true, message: `Request failed: ${message}` }
  }
}

export function isCheckionError<T>(r: T | CheckionFetchError): r is CheckionFetchError {
  return typeof r === 'object' && r !== null && 'error' in r && (r as CheckionFetchError).error === true
}
