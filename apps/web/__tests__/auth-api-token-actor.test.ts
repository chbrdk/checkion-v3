import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/runtime-config', () => ({
  getPlexonServiceSecret: vi.fn(() => 'svc-secret'),
}))

vi.mock('../lib/fixtures/api-tokens-store', () => ({
  resolveApiTokenOwner: vi.fn(async () => ({ ownerId: 'token-owner', tokenId: 'tok-1' })),
}))

vi.mock('../auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'session-user' } })),
}))

import { getPlexonServiceSecret } from '../lib/runtime-config'
import { resolveApiTokenOwner } from '../lib/fixtures/api-tokens-store'
import {
  getRequestUser,
  isCheckionMachineEnvToken,
  PLEXON_USER_ID_HEADER,
} from '../lib/auth-api-token'
import { PLEXON_CONTRACT_VERSION_HEADER, PLEXON_SERVICE_SECRET_HEADER } from '../lib/plexon-contract'
import { paths } from '../lib/paths'

describe('getRequestUser machine → actor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPlexonServiceSecret).mockReturnValue('svc-secret')
    process.env[paths.envCheckionApiToken] = 'checkion_machine_token_value_32bytes_hex!!'
  })

  afterEach(() => {
    delete process.env[paths.envCheckionApiToken]
  })

  it('detects Coolify machine env token', () => {
    expect(
      isCheckionMachineEnvToken('Bearer checkion_machine_token_value_32bytes_hex!!'),
    ).toBe(true)
    expect(isCheckionMachineEnvToken('Bearer checkion_other')).toBe(false)
  })

  it('service secret without actor fails closed', async () => {
    const req = new Request('http://localhost/api/projects', {
      headers: {
        [PLEXON_SERVICE_SECRET_HEADER]: 'svc-secret',
        [PLEXON_CONTRACT_VERSION_HEADER]: paths.federationContract,
      },
    })
    expect(await getRequestUser(req)).toBeNull()
  })

  it('service secret + actor returns actor', async () => {
    const req = new Request('http://localhost/api/projects', {
      headers: {
        [PLEXON_SERVICE_SECRET_HEADER]: 'svc-secret',
        [PLEXON_CONTRACT_VERSION_HEADER]: paths.federationContract,
        [PLEXON_USER_ID_HEADER]: 'actor-a',
      },
    })
    expect(await getRequestUser(req)).toEqual({ id: 'actor-a' })
  })

  it('machine Bearer without actor fails closed', async () => {
    const req = new Request('http://localhost/api/projects', {
      headers: { Authorization: 'Bearer checkion_machine_token_value_32bytes_hex!!' },
    })
    expect(await getRequestUser(req)).toBeNull()
    expect(resolveApiTokenOwner).not.toHaveBeenCalled()
  })

  it('machine Bearer + actor returns actor (not token owner)', async () => {
    const req = new Request('http://localhost/api/projects', {
      headers: {
        Authorization: 'Bearer checkion_machine_token_value_32bytes_hex!!',
        [PLEXON_USER_ID_HEADER]: 'actor-b',
      },
    })
    expect(await getRequestUser(req)).toEqual({ id: 'actor-b' })
    expect(resolveApiTokenOwner).not.toHaveBeenCalled()
  })

  it('personal Settings Bearer still uses token owner', async () => {
    const req = new Request('http://localhost/api/projects', {
      headers: { Authorization: 'Bearer checkion_personal_not_env' },
    })
    expect(await getRequestUser(req)).toEqual({ id: 'token-owner' })
  })
})
