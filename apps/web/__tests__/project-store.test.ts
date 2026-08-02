import { describe, expect, it, beforeEach } from 'vitest'
import { UNASSIGNED_PROJECT_ID } from '@checkion-v3/contracts'
import {
  applyPlatformBinding,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  normalizeProjectDomain,
  resetProjectStore,
  setProjectCapabilityStatus,
  updateProject,
  upsertByPlatformProjectId,
} from '../lib/fixtures/project-store'
import { createScan, getScan } from '../lib/fixtures/scan-store'

describe('project store CRUD', () => {
  beforeEach(() => {
    resetProjectStore()
  })

  it('normalizes domain hostnames', async () => {
    expect(normalizeProjectDomain('https://www.Example.com/path')).toBe('www.example.com')
    expect(normalizeProjectDomain('docs.msqdx.example')).toBe('docs.msqdx.example')
  })

  it('creates a project with local platform id', async () => {
    const before = ((await listProjects())).length
    const created = await createProject({
      name: 'Acme QA',
      domain: 'https://qa.acme.example/home',
      description: 'Local mirror',
    })
    expect(created.id).toMatch(/^proj-/)
    expect(created.domain).toBe('qa.acme.example')
    expect(created.platformProjectId).toMatch(/^plx-local-/)
    expect(created.capabilityStatus).toBe('pending')
    expect(((await listProjects())).length).toBe(before + 1)
    expect((((await getProject(created.id)))?.description)).toBe('Local mirror')
  })

  it('updates editable fields', async () => {
    const created = await createProject({ name: 'Edit me', domain: 'edit.example' })
    const updated = await updateProject(created.id, {
      name: 'Edited',
      domain: 'https://edited.example/',
      description: 'Updated copy',
    })
    expect(updated?.name).toBe('Edited')
    expect(updated?.domain).toBe('edited.example')
    expect(updated?.description).toBe('Updated copy')
    expect(updated?.platformProjectId).toBe(created.platformProjectId)
  })

  it('deletes a project and reassigns scans to unassigned', async () => {
    const created = await createProject({ name: 'Temp', domain: 'temp.example' })
    const scan = await createScan({
      projectId: created.id,
      mode: 'single',
      url: 'https://temp.example/',
    })

    expect((await deleteProject(created.id))).toBe(true)
    expect((await getProject(created.id))).toBeNull()
    expect((((await getScan(scan.id)))?.projectId)).toBe(UNASSIGNED_PROJECT_ID)
  })

  it('refuses to delete the unassigned bucket', async () => {
    expect((await deleteProject(UNASSIGNED_PROJECT_ID))).toBe(false)
  })

  it('applies platform binding after outbound origin', async () => {
    const created = await createProject({ name: 'Bind me', domain: 'bind.example' })
    const bound = await applyPlatformBinding(created.id, {
      platformProjectId: 'pp-from-plexon',
      capabilityStatus: 'in_sync',
    })
    expect(bound?.platformProjectId).toBe('pp-from-plexon')
    expect(bound?.capabilityStatus).toBe('in_sync')
  })

  it('upserts inbound Plexon mirrors as in_sync', async () => {
    const first = await upsertByPlatformProjectId('pp-in', { name: 'In', domain: 'in.example' })
    expect(first.capabilityStatus).toBe('in_sync')
    const second = await upsertByPlatformProjectId('pp-in', { name: 'In 2', domain: 'in2.example' })
    expect(second.id).toBe(first.id)
    expect(second.name).toBe('In 2')
  })

  it('sets capability status independently', async () => {
    const created = await createProject({ name: 'Cap', domain: 'cap.example' })
    expect(((await setProjectCapabilityStatus(created.id, 'error'))?.capabilityStatus)).toBe('error')
  })
})
