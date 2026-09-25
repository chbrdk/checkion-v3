import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  collectionActivityApiPath,
  postCollectionActivityDistillate,
} from '../lib/plexon-collection-activity'
import {
  CLIENT_ROOM_SLOT_CHECKION_OVERVIEW,
  clientRoomSlotApiPath,
  putClientRoomSlot,
} from '../lib/plexon-client-room'
import { postSuiteAuditEvent, suiteAuditApiPath } from '../lib/plexon-suite-audit'

describe('plexon suite enterprise clients (checkion)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('builds provisioning audit URL', () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec')
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    expect(suiteAuditApiPath('pp-1')).toBe(
      'https://plexon.test/api/platform/provisioning/collections/pp-1/audit',
    )
  })

  it('builds ClientRoom slot URL for checkion_overview', () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec')
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    expect(CLIENT_ROOM_SLOT_CHECKION_OVERVIEW).toBe('checkion_overview')
    expect(clientRoomSlotApiPath('pp-room', CLIENT_ROOM_SLOT_CHECKION_OVERVIEW)).toBe(
      'https://plexon.test/api/platform/provisioning/collections/pp-room/client-room/slots/checkion_overview',
    )
  })

  it('POSTs audit with contract + bearer + actor body', async () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec-test')
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const ok = await postSuiteAuditEvent({
      platformProjectId: 'pp-1',
      productId: 'checkion',
      action: 'run_finished',
      actorUserId: 'user-9',
      subjectRef: 'geo-1',
    })
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://plexon.test/api/platform/provisioning/collections/pp-1/audit',
    )
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sec-test')
    expect(headers['X-Service-Secret']).toBe('sec-test')
    expect(headers['X-Plexon-Contract-Version']).toBe('2026-05-plexon-federation-v3')
    expect(JSON.parse(String(init.body))).toEqual({
      actorUserId: 'user-9',
      productId: 'checkion',
      action: 'run_finished',
      subjectRef: 'geo-1',
    })
  })

  it('PUTs ClientRoom slot with contract + bearer + actor', async () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec-test')
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const ok = await putClientRoomSlot({
      platformProjectId: 'pp-room',
      productId: 'checkion',
      subjectRef: 'scan-1',
      title: 'Acme — Overview',
      href: 'https://checkion.test/results/scan-1/overview',
      actorUserId: 'user-9',
    })
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://plexon.test/api/platform/provisioning/collections/pp-room/client-room/slots/checkion_overview',
    )
    expect(init.method).toBe('PUT')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sec-test')
    expect(headers['X-Service-Secret']).toBe('sec-test')
    expect(headers['X-Plexon-Contract-Version']).toBe('2026-05-plexon-federation-v3')
    expect(headers['X-Plexon-User-Id']).toBe('user-9')
    expect(JSON.parse(String(init.body))).toEqual({
      productId: 'checkion',
      subjectRef: 'scan-1',
      title: 'Acme — Overview',
      href: 'https://checkion.test/results/scan-1/overview',
      actorUserId: 'user-9',
    })
  })

  it('PUTs ClientRoom clear body', async () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec-test')
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await putClientRoomSlot({
        platformProjectId: 'pp-room',
        clear: true,
        actorUserId: 'user-9',
      }),
    ).toBe(true)
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      clear: true,
      actorUserId: 'user-9',
    })
  })

  it('returns false on room_missing 404 without throwing', async () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec-test')
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)

    expect(
      await putClientRoomSlot({
        platformProjectId: 'pp-room',
        productId: 'checkion',
        subjectRef: 'scan-1',
        title: 'Overview',
        actorUserId: 'user-9',
      }),
    ).toBe(false)
  })

  it('POSTs activity distillate shape', async () => {
    vi.stubEnv('NEXT_PLEXON_BASE_URL', 'https://plexon.test')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec-test')
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'live')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    expect(collectionActivityApiPath('pp-2')).toContain('/activity')
    const ok = await postCollectionActivityDistillate({
      platformProjectId: 'pp-2',
      productId: 'checkion',
      kind: 'geo_job',
      status: 'completed',
      subjectRef: 'geo-2',
      title: 'GEO Acme',
      href: 'https://checkion.test/geo/geo-2',
    })
    expect(ok).toBe(true)
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      productId: 'checkion',
      kind: 'geo_job',
      status: 'completed',
      subjectRef: 'geo-2',
      title: 'GEO Acme',
      href: 'https://checkion.test/geo/geo-2',
    })
  })

  it('skips audit when federation dummy', async () => {
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'dummy')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(
      await postSuiteAuditEvent({
        platformProjectId: 'pp-1',
        productId: 'checkion',
        action: 'run_finished',
        actorUserId: 'u1',
        subjectRef: 'x',
      }),
    ).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('skips ClientRoom PUT when federation dummy', async () => {
    vi.stubEnv('CHECKION_FEDERATION_MODE', 'dummy')
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'sec')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(
      await putClientRoomSlot({
        platformProjectId: 'pp-1',
        productId: 'checkion',
        subjectRef: 'x',
        title: 'Overview',
        actorUserId: 'u1',
      }),
    ).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
