import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApiTokenForOwner,
  listApiTokensForOwner,
  revokeApiTokenForOwner,
  toApiTokenOwnerId,
  verifyApiTokenBearer,
} from '../lib/api-tokens'
import { resetApiTokensStore } from '../lib/fixtures/api-tokens-store'
import { paths } from '../lib/paths'

vi.mock('../auth', () => ({
  auth: async () => ({ user: { id: paths.apiTokenFixtureOwnerId, email: 'local@test' } }),
}))

describe('api tokens store roundtrip (fixture mode)', () => {
  afterEach(() => {
    resetApiTokensStore()
  })

  it('uses fixture owner when no session', () => {
    expect(toApiTokenOwnerId(null)).toBe(paths.apiTokenFixtureOwnerId)
    expect(toApiTokenOwnerId({ id: 'u-1' })).toBe('u-1')
  })

  it('creates hashed token, lists without secret, verifies, revokes', async () => {
    const owner = paths.apiTokenFixtureOwnerId
    const created = await createApiTokenForOwner(owner, 'MCP')
    expect(created.token.startsWith(paths.apiTokenPrefix)).toBe(true)
    expect(created.token.length).toBe(paths.apiTokenPrefix.length + paths.apiTokenBytes * 2)
    expect(created.label).toBe('MCP')
    expect(created.prefix.startsWith(paths.apiTokenPrefix)).toBe(true)
    expect(JSON.stringify(await listApiTokensForOwner(owner))).not.toContain(created.token)

    const ok = await verifyApiTokenBearer(`Bearer ${created.token}`)
    expect('error' in ok).toBe(false)
    if ('error' in ok) return
    expect(ok.ownerId).toBe(owner)
    expect(ok.tokenId).toBe(created.id)

    expect(await revokeApiTokenForOwner(created.id, owner)).toEqual({ ok: true })
    expect((await listApiTokensForOwner(owner)).items).toHaveLength(0)
    expect(await verifyApiTokenBearer(created.token)).toEqual({
      error: 'Invalid or missing API token',
      status: 401,
    })
  })

  it('rejects revoke for wrong owner', async () => {
    const created = await createApiTokenForOwner('owner-a', 'x')
    expect(await revokeApiTokenForOwner(created.id, 'owner-b')).toEqual({
      error: 'Token not found or already revoked',
      status: 404,
    })
  })

  it('GET/POST /api/tokens and verify route roundtrip', async () => {
    const { GET, POST } = await import('../app/api/tokens/route')
    const listEmpty = await GET()
    expect(listEmpty.status).toBe(200)
    const emptyBody = await listEmpty.json()
    expect(Array.isArray(emptyBody.items)).toBe(true)

    const createdRes = await POST(
      new Request('http://localhost/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Route test' }),
      }),
    )
    expect(createdRes.status).toBe(201)
    const created = await createdRes.json()
    expect(created.token.startsWith(paths.apiTokenPrefix)).toBe(true)
    expect(created.label).toBe('Route test')

    const listed = await (await GET()).json()
    expect(listed.items.some((t: { id: string }) => t.id === created.id)).toBe(true)
    expect(JSON.stringify(listed)).not.toContain(created.token)

    const { POST: verify } = await import('../app/api/tokens/verify/route')
    const verified = await verify(
      new Request('http://localhost/api/tokens/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${created.token}` },
      }),
    )
    expect(verified.status).toBe(200)
    const vBody = await verified.json()
    expect(vBody.ok).toBe(true)
    expect(vBody.tokenId).toBe(created.id)

    const { DELETE } = await import('../app/api/tokens/[tokenId]/route')
    const revoked = await DELETE(new Request('http://localhost/api/tokens/x', { method: 'DELETE' }), {
      params: Promise.resolve({ tokenId: created.id }),
    })
    expect(revoked.status).toBe(200)
  })
})
