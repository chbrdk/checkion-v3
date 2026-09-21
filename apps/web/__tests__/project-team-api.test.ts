import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'viewer-1' } })),
}))

vi.mock('../lib/fixtures/project-store', () => ({
  getProject: vi.fn(),
}))

vi.mock('../lib/project-access', () => ({
  viewerCanAccessProject: vi.fn(async () => true),
}))

vi.mock('../lib/plexon-platform-id', () => ({
  isRealPlatformProjectId: (id: string | null | undefined) => {
    const trimmed = id?.trim()
    if (!trimmed) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  },
}))

vi.mock('../lib/collection-members-plexon', () => ({
  fetchCollectionMembersFromPlexon: vi.fn(),
  addCollectionMemberOnPlexon: vi.fn(),
  createCollectionInviteOnPlexon: vi.fn(),
}))

import { getProject } from '../lib/fixtures/project-store'
import {
  addCollectionMemberOnPlexon,
  createCollectionInviteOnPlexon,
  fetchCollectionMembersFromPlexon,
} from '../lib/collection-members-plexon'

describe('project members BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getProject).mockResolvedValue({
      id: 'proj-1',
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      name: 'Demo',
    } as never)
  })

  it('GET returns plexon roster', async () => {
    vi.mocked(fetchCollectionMembersFromPlexon).mockResolvedValue({
      ok: true,
      items: [
        {
          userId: 'u1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'admin',
          source: 'creator',
        },
      ],
    })
    const { GET } = await import('../app/api/projects/[id]/members/route')
    const res = await GET(new Request('http://localhost/api/projects/proj-1/members'), {
      params: Promise.resolve({ id: 'proj-1' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ email: string }> }
    expect(body.items[0]?.email).toBe('owner@example.com')
  })

  it('POST without collection returns 400', async () => {
    vi.mocked(getProject).mockResolvedValue({
      id: 'proj-1',
      platformProjectId: 'plx-local-demo',
      name: 'Demo',
    } as never)
    const { POST } = await import('../app/api/projects/[id]/members/route')
    const res = await POST(
      new Request('http://localhost/api/projects/proj-1/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.c' }),
      }),
      { params: Promise.resolve({ id: 'proj-1' }) },
    )
    expect(res.status).toBe(400)
  })

  it('POST invite returns inviteUrl', async () => {
    vi.mocked(createCollectionInviteOnPlexon).mockResolvedValue({
      ok: true,
      inviteUrl: 'https://plexon.test/invite/tok',
      inviteId: 'inv-1',
    })
    const { POST } = await import('../app/api/projects/[id]/invites/route')
    const res = await POST(
      new Request('http://localhost/api/projects/proj-1/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'member' }),
      }),
      { params: Promise.resolve({ id: 'proj-1' }) },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { inviteUrl: string }
    expect(body.inviteUrl).toContain('/invite/')
    expect(addCollectionMemberOnPlexon).not.toHaveBeenCalled()
    expect(createCollectionInviteOnPlexon).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'member' }),
    )
  })

  it('POST invite forwards toEmail to Plexon', async () => {
    vi.mocked(createCollectionInviteOnPlexon).mockResolvedValue({
      ok: true,
      inviteUrl: 'https://plexon.test/invite/tok',
      inviteId: 'inv-1',
      emailedTo: 'peer@example.com',
    })
    const { POST } = await import('../app/api/projects/[id]/invites/route')
    const res = await POST(
      new Request('http://localhost/api/projects/proj-1/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'member', toEmail: ' peer@example.com ' }),
      }),
      { params: Promise.resolve({ id: 'proj-1' }) },
    )
    expect(res.status).toBe(200)
    expect(createCollectionInviteOnPlexon).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: 'peer@example.com' }),
    )
    const body = (await res.json()) as { emailedTo?: string }
    expect(body.emailedTo).toBe('peer@example.com')
  })
})
