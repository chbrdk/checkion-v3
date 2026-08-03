/** Runtime env resolution — no hardcoded service bases in call sites. */

import { paths } from './paths'

/**
 * plexon-v3 API base for federation / knowledge pack.
 * Prefer NEXT_PLEXON_BASE_URL; fall back to PLEXON_AUTH_URL when ops only set auth
 * (same host in staging); last resort localhost for local fixture probes.
 */
export function plexonBaseUrl(): string {
  const explicit = process.env[paths.envPlexonBase]?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const auth = process.env[paths.envPlexonAuthUrl]?.trim()
  if (auth) return auth.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export function checkionPublicUrl(): string {
  return process.env[paths.envCheckionPublicUrl]?.trim() || `http://localhost:${paths.devPort}`
}

export function getPlexonServiceSecret(): string {
  return process.env[paths.envPlexonServiceSecret]?.trim() || ''
}

/** Plexon auth URL (runtime — do not cache at import). */
export function getPlexonAuthUrl(): string {
  return process.env[paths.envPlexonAuthUrl]?.trim() || ''
}

export function getPlexonRegisterUrl(): string | null {
  return process.env[paths.envPlexonRegisterUrl]?.trim() || null
}

export function isPlexonAuthConfigured(): boolean {
  return Boolean(getPlexonAuthUrl() && getPlexonServiceSecret())
}

export type FederationRuntimeMode = 'dummy' | 'live'

/** Prefer env override; fall back to paths.federationMode. */
export function getFederationMode(): FederationRuntimeMode {
  const raw = process.env[paths.envFederationMode]?.trim().toLowerCase()
  if (raw === 'live' || raw === 'dummy') return raw
  return paths.federationMode
}

export function isPlexonFederationConfigured(): boolean {
  return Boolean(plexonBaseUrl() && getPlexonServiceSecret())
}

/** Demo owner/company for CHECKION→Plexon origin when no session exists yet. */
export function getPlexonDemoOwnerUserId(): string {
  return process.env[paths.envPlexonDemoOwner]?.trim() || ''
}

export function getPlexonDemoCompanyId(): string {
  return process.env[paths.envPlexonDemoCompany]?.trim() || ''
}
