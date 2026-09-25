import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProjectListPanel } from '../components/project-panels'
import type { ProjectSummary } from '@checkion-v3/contracts'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

const projects: ProjectSummary[] = [
  {
    id: 'proj-1',
    name: 'Alpha',
    domain: 'alpha.example.com',
    status: 'active',
    platformProjectId: 'plx-1',
    capabilityStatus: 'in_sync',
    lastScanAt: '2026-08-20T12:00:00.000Z',
    scanCount: 3,
  },
]

describe('ProjectListPanel layout', () => {
  it('toggles between tiles and numbered list', () => {
    render(<ProjectListPanel projects={projects} />)
    expect(screen.getByLabelText('Projects').className).toContain('ds-collection-hub-grid')
    expect(document.querySelector('.ds-hub-index-layout-switch')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    const list = screen.getByRole('list', { name: 'Projects' })
    expect(list.className).toContain('ds-collection-hub-list')
    expect(screen.getByRole('link', { name: 'Alpha' })).toBeTruthy()
    expect(screen.getByLabelText('Project metrics').textContent).toMatch(/3 scans/)
    expect(screen.getByRole('button', { name: 'Open' }).closest('.ds-collection-hub-list-row__trail')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }))
    expect(screen.getByLabelText('Projects').className).toContain('ds-collection-hub-grid')
  })
})
