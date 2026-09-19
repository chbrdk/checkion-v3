import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../lib/runtime-config', () => ({
  getFederationMode: vi.fn(() => 'live'),
  isPlexonFederationConfigured: vi.fn(() => true),
  isPlexonAuthConfigured: vi.fn(() => true),
  getPlexonServiceSecret: vi.fn(() => 'secret'),
  plexonBaseUrl: vi.fn(() => 'http://plexon.test'),
}))

vi.mock('../lib/plexon-contract', () => ({
  getPlexonContractHeaders: () => ({ 'X-Service-Secret': 'secret' }),
}))

vi.mock('../lib/paths', () => ({
  paths: { plexonAccessibleCollectionsPath: '/api/federation/v1/accessible-collections' },
}))

describe('fetchAccessiblePlatformProjectIds cursor paging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('pages through nextCursor until exhausted', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'pp-1' }, { id: 'pp-2' }],
          nextCursor: 'cursor-2',
          truncated: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'pp-3' }],
          nextCursor: null,
          truncated: false,
        }),
      })

    const { fetchAccessiblePlatformProjectIds } = await import('../lib/project-access')
    const ids = await fetchAccessiblePlatformProjectIds('user-1')
    expect(ids).toEqual(new Set(['pp-1', 'pp-2', 'pp-3']))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondUrl = String(fetchMock.mock.calls[1]![0])
    expect(secondUrl).toContain('cursor=cursor-2')
  })
})
