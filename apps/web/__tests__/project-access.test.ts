import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('../runtime-config', () => ({
  getFederationMode: vi.fn(() => 'dummy'),
  isPlexonFederationConfigured: vi.fn(() => false),
  getPlexonServiceSecret: vi.fn(() => ''),
  plexonBaseUrl: vi.fn(() => 'http://localhost:3000'),
}))

import { filterProjectsForViewer, projectVisibleToOwner } from '../lib/project-access'

describe('project-access (model B)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides all projects when viewer is null', async () => {
    const items = await filterProjectsForViewer(
      [{ platformProjectId: 'pp-1', ownerPlexonUserId: 'u1' }],
      null,
    )
    expect(items).toEqual([])
  })

  it('keeps projects owned by the viewer when federation is off', async () => {
    const items = await filterProjectsForViewer(
      [
        { id: 'a', platformProjectId: 'pp-1', ownerPlexonUserId: 'u1' },
        { id: 'b', platformProjectId: 'pp-2', ownerPlexonUserId: 'u2' },
      ],
      'u1',
    )
    expect(items.map((p) => p.id)).toEqual(['a'])
  })

  it('projectVisibleToOwner requires matching owner id', () => {
    expect(projectVisibleToOwner({ ownerPlexonUserId: 'u1' }, 'u1')).toBe(true)
    expect(projectVisibleToOwner({ ownerPlexonUserId: 'u2' }, 'u1')).toBe(false)
    expect(projectVisibleToOwner({}, 'u1')).toBe(false)
  })
})
