/**
 * Google Search Console OAuth + Search Analytics client.
 * Spec: specs/domain/seo-dataforseo.md § GSC · seo-market-suggest-agent.md Phase 6
 */
import type { SeoGscPerformanceResult, SeoGscPerformanceRow } from '@checkion-v3/contracts'
import { paths } from '../paths'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export function googleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID ?? '').trim()
}

export function googleClientSecret(): string {
  return (process.env.GOOGLE_CLIENT_SECRET ?? '').trim()
}

export function gscOAuthConfigured(): boolean {
  return Boolean(googleClientId() && googleClientSecret())
}

export function gscOAuthCallbackUrl(projectId: string, origin: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}${paths.routes.apiProjectSeoGscOAuthCallback(projectId)}`
}

export function buildGscAuthorizeUrl(input: {
  projectId: string
  origin: string
  state: string
}): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: gscOAuthCallbackUrl(input.projectId, input.origin),
    response_type: 'code',
    scope: GSC_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: input.state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGscCode(input: {
  code: string
  projectId: string
  origin: string
}): Promise<{ refreshToken: string; accessToken: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: input.code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: gscOAuthCallbackUrl(input.projectId, input.origin),
      grant_type: 'authorization_code',
    }),
  })
  const data = (await res.json()) as {
    refresh_token?: string
    access_token?: string
    error?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || `gsc_token_exchange_${res.status}`)
  }
  if (!data.refresh_token) {
    throw new Error('gsc_missing_refresh_token')
  }
  return { refreshToken: data.refresh_token, accessToken: data.access_token }
}

export async function refreshGscAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      grant_type: 'refresh_token',
    }),
  })
  const data = (await res.json()) as { access_token?: string; error?: string }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || `gsc_refresh_${res.status}`)
  }
  return data.access_token
}

export async function listGscSites(accessToken: string): Promise<string[]> {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json()) as { siteEntry?: Array<{ siteUrl?: string }> }
  if (!res.ok) throw new Error(`gsc_sites_${res.status}`)
  return (data.siteEntry ?? []).map((s) => s.siteUrl).filter(Boolean) as string[]
}

export async function fetchGscSearchAnalytics(input: {
  accessToken: string
  siteUrl: string
  startDate: string
  endDate: string
  rowLimit?: number
}): Promise<SeoGscPerformanceRow[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        startDate: input.startDate,
        endDate: input.endDate,
        dimensions: ['query'],
        rowLimit: input.rowLimit ?? 25,
      }),
    },
  )
  const data = (await res.json()) as {
    rows?: Array<{
      keys?: string[]
      clicks?: number
      impressions?: number
      ctr?: number
      position?: number
    }>
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(data.error?.message || `gsc_analytics_${res.status}`)
  }
  return (data.rows ?? [])
    .map((r) => ({
      query: (r.keys?.[0] ?? '').trim(),
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }))
    .filter((r) => r.query)
}

export async function liveGscPerformance(input: {
  projectId: string
  siteUrl: string
  refreshToken: string
  startDate: string
  endDate: string
}): Promise<SeoGscPerformanceResult> {
  const accessToken = await refreshGscAccessToken(input.refreshToken)
  const items = await fetchGscSearchAnalytics({
    accessToken,
    siteUrl: input.siteUrl,
    startDate: input.startDate,
    endDate: input.endDate,
  })
  return {
    source: 'gsc',
    stubbed: false,
    fetchedAt: new Date().toISOString(),
    projectId: input.projectId,
    siteUrl: input.siteUrl,
    startDate: input.startDate,
    endDate: input.endDate,
    items,
  }
}
