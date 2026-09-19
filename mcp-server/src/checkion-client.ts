/**
 * HTTP client for checkion-v3 API.
 * Auth: PLEXON_SERVICE_SECRET + X-Plexon-User-Id (assistant / Access Model B),
 * or Bearer CHECKION_API_TOKEN (+ actor header when token is the Coolify machine token).
 * Spec: plexon-v3/specs/domain/assistant-actor-identity.md
 */

import { AsyncLocalStorage } from 'node:async_hooks'

const BASE_URL = process.env.CHECKION_API_URL ?? ''
const TOKEN = process.env.CHECKION_API_TOKEN ?? ''
const SERVICE_SECRET = process.env.PLEXON_SERVICE_SECRET?.trim() || ''
const CONTRACT =
  process.env.PLEXON_FEDERATION_CONTRACT_VERSION?.trim() ||
  '2026-05-plexon-federation-v3'

export const PLEXON_USER_ID_HEADER = 'X-Plexon-User-Id'
export const PLEXON_SERVICE_SECRET_HEADER = 'X-Service-Secret'
export const PLEXON_CONTRACT_VERSION_HEADER = 'X-Plexon-Contract-Version'

/** Per-tool actor from MCP args (see registerCheckionV3Tools wrapper). */
export const checkionActorStore = new AsyncLocalStorage<string>()

export interface CheckionFetchError {
  error: true
  message: string
  status?: number
}

export type CheckionFetchOptions = {
  actorUserId?: string
}

export type CheckionRequestInit = RequestInit & {
  checkion?: CheckionFetchOptions
}

export async function checkionFetch<T = unknown>(
  path: string,
  options: CheckionRequestInit = {},
): Promise<T | CheckionFetchError> {
  if (!BASE_URL) {
    return { error: true, message: 'CHECKION_API_URL not configured' }
  }
  if (!SERVICE_SECRET && !TOKEN) {
    return {
      error: true,
      message: 'PLEXON_SERVICE_SECRET or CHECKION_API_TOKEN not configured',
    }
  }

  const { checkion, ...fetchOptions } = options
  const actor =
    checkion?.actorUserId?.trim() || checkionActorStore.getStore()?.trim() || ''

  if (SERVICE_SECRET && !actor && !TOKEN) {
    return {
      error: true,
      message: 'actorUserId required when using PLEXON_SERVICE_SECRET',
    }
  }

  const url = path.startsWith('http')
    ? path
    : `${BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (SERVICE_SECRET) {
    headers[PLEXON_SERVICE_SECRET_HEADER] = SERVICE_SECRET
    headers[PLEXON_CONTRACT_VERSION_HEADER] = CONTRACT
    if (actor) headers[PLEXON_USER_ID_HEADER] = actor
  }
  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`
    if (actor) headers[PLEXON_USER_ID_HEADER] = actor
  }

  try {
    const res = await fetch(url, { ...fetchOptions, headers })
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
