import { describe, expect, it } from 'vitest'
import { listProjects, upsertByPlatformProjectId } from '@/lib/fixtures/project-store'

describe('project list hides archived federation mirrors', () => {
  it('excludes archived projects from listProjects', async () => {
    const created = await upsertByPlatformProjectId(`plx-arch-test-${Date.now()}`, {
      name: 'Archived Mirror',
      domain: 'example.com',
      status: 'archived',
    })
    const items = await listProjects()
    expect(items.some((p) => p.id === created.id)).toBe(false)
  })
})
