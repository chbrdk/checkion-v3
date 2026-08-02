import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ScanLaunchForm, defaultGeoQueries } from '../components/scan-launch-form'
import { paths } from '../lib/paths'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

const projects = [
  { id: 'proj-1', name: 'Demo Project' },
  { id: 'proj-2', name: 'Other' },
]

describe('defaultGeoQueries', () => {
  it('derives host-aware prompts', () => {
    const qs = defaultGeoQueries('https://www.bosch-ebike.com/de/')
    expect(qs[0]).toMatch(/bosch-ebike/i)
    expect(qs.length).toBe(3)
  })
})

describe('ScanLaunchForm', () => {
  afterEach(() => {
    push.mockReset()
    vi.unstubAllGlobals()
  })

  it('renders inviting launch IA with Single / Deep / GEO modes', () => {
    render(<ScanLaunchForm projects={projects} />)
    expect(screen.getByRole('heading', { name: /Start a run/i })).toBeTruthy()
    expect(screen.getByRole('group', { name: /Launch mode/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Single' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Deep' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'GEO' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Launch single scan/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Single · scan-single-1/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /GEO · geo-1/i })).toBeTruthy()
  })

  it('shows GEO fields when GEO mode is selected', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" />)
    expect(screen.getByRole('button', { name: /Start GEO job/i })).toBeTruthy()
    expect(screen.getByLabelText(/GEO queries/i)).toBeTruthy()
    expect(screen.getByLabelText(/GEO models/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'GEO' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('.checkion-launch-mode__hint')).toBeTruthy()
  })

  it('locks AUDION handoff to single mode', () => {
    render(
      <ScanLaunchForm
        projects={projects}
        fromAudion
        defaultProjectId="proj-1"
        defaultUrl="https://example.com/step"
        correlation={{ audionRunId: 'run-1', platformProjectId: 'col-1' }}
      />,
    )
    expect(screen.getByRole('heading', { name: /Scan this page/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'GEO' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Deep' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Single' })).toBeTruthy()
  })

  it('posts GEO job and navigates to overview', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, jobId: 'geo-new-1', status: 'completed' }),
    })) as unknown as typeof fetch & { mock: { calls: Array<[unknown, RequestInit?]> } }
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultProjectId="proj-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Start GEO job/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    const call = (fetchMock as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock.calls[0]
    expect(call?.[0]).toBe(paths.routes.apiGeoJobs)
    expect(call?.[1]?.method).toBe('POST')
    const body = JSON.parse(String(call?.[1]?.body)) as {
      projectId: string
      url: string
      queries: string[]
      models: string[]
    }
    expect(body.projectId).toBe('proj-1')
    expect(body.url).toContain('http')
    expect(body.queries.length).toBeGreaterThan(0)
    expect(body.models).toEqual(['gpt-5.4-nano'])
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(paths.routes.geoSection('geo-new-1', 'overview'))
    })
  })

  it('posts single scan and navigates to results overview', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'scan-new-1' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ScanLaunchForm
        projects={projects}
        defaultMode="single"
        defaultProjectId="proj-1"
        defaultUrl="https://example.com/"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Launch single scan/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = (fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock
      .calls[0]
    expect(call?.[0]).toBe(paths.routes.apiScans)
    const body = JSON.parse(String(call?.[1]?.body)) as { mode: string; url: string }
    expect(body.mode).toBe('single')
    expect(body.url).toBe('https://example.com/')
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(paths.routes.resultSection('scan-new-1', 'overview'))
    })
  })
})

describe('scanLaunch deep-links', () => {
  it('supports mode=geo', () => {
    expect(paths.routes.scanLaunch({ projectId: 'p1', mode: 'geo', url: 'https://a.com' })).toBe(
      '/scan?projectId=p1&mode=geo&url=https%3A%2F%2Fa.com',
    )
  })
})
