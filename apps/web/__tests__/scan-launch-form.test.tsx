import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  ScanLaunchForm,
  capabilityFromLaunchMode,
  defaultGeoQueries,
  launchModeFromState,
  wcagDepthFromLaunchMode,
} from '../components/scan-launch-form'
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

describe('launch mode mapping', () => {
  it('maps deep-links into capability + WCAG depth', () => {
    expect(capabilityFromLaunchMode('seo')).toBe('seo')
    expect(capabilityFromLaunchMode('geo')).toBe('geo')
    expect(capabilityFromLaunchMode('single')).toBe('wcag')
    expect(capabilityFromLaunchMode('deep')).toBe('wcag')
    expect(wcagDepthFromLaunchMode('deep')).toBe('deep')
    expect(wcagDepthFromLaunchMode('single')).toBe('single')
    expect(launchModeFromState('seo', 'single')).toBe('seo')
    expect(launchModeFromState('wcag', 'deep')).toBe('deep')
  })
})

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

  it('renders inviting launch IA with SEO / GEO / WCAG capability tiles', () => {
    render(<ScanLaunchForm projects={projects} />)
    expect(screen.getByRole('heading', { name: /Start a run/i })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: /Capability/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /SEO\./i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /GEO\./i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /WCAG\./i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /WCAG\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radiogroup', { name: /WCAG depth/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /Quick single scan/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /Deep scan/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Launch single scan/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /SEO · domain-1/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /GEO · geo-1/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /WCAG · scan-single-1/i })).toBeTruthy()
  })

  it('reveals WCAG depth only when WCAG is selected', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="seo" />)
    expect(screen.getByRole('radio', { name: /SEO\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Launch SEO crawl/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /WCAG\./i }))
    expect(screen.getByRole('radiogroup', { name: /WCAG depth/i })).toBeTruthy()
  })

  it('shows GEO fields when GEO capability is selected', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" />)
    expect(screen.getByRole('button', { name: /Start GEO job/i })).toBeTruthy()
    expect(screen.getByLabelText(/GEO queries/i )).toBeTruthy()
    expect(screen.getByLabelText(/GEO models/i)).toBeTruthy()
    expect(screen.getByRole('radio', { name: /GEO\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
  })

  it('locks AUDION handoff to WCAG Quick single', () => {
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
    expect(screen.queryByRole('radio', { name: /GEO\./i })).toBeNull()
    expect(screen.queryByRole('radio', { name: /SEO\./i })).toBeNull()
    expect(screen.getByRole('radio', { name: /WCAG\./i })).toBeTruthy()
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Launch single scan/i })).toBeTruthy()
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

  it('posts SEO domain crawl and navigates to domain overview', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'domain-seo-1' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ScanLaunchForm
        projects={projects}
        defaultMode="seo"
        defaultProjectId="proj-1"
        defaultUrl="https://example.com/"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Launch SEO crawl/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = (fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock
      .calls[0]
    expect(call?.[0]).toBe(paths.routes.apiDomainScans)
    const body = JSON.parse(String(call?.[1]?.body)) as { projectId: string; url: string }
    expect(body.projectId).toBe('proj-1')
    expect(body.url).toBe('https://example.com/')
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(paths.routes.domainSection('domain-seo-1', 'overview'))
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
    fireEvent.click(screen.getByRole('button', { name: /^Launch single scan$/i }))

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

  it('posts deep WCAG scan when Deep scan is selected', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'scan-deep-1' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ScanLaunchForm
        projects={projects}
        defaultMode="deep"
        defaultProjectId="proj-1"
        defaultUrl="https://example.com/"
      />,
    )
    expect(screen.getByRole('radio', { name: /Deep scan/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: /Launch deep scan/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = (fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock
      .calls[0]
    const body = JSON.parse(String(call?.[1]?.body)) as { mode: string }
    expect(body.mode).toBe('deep')
  })
})

describe('scanLaunch deep-links', () => {
  it('supports mode=geo and mode=seo', () => {
    expect(paths.routes.scanLaunch({ projectId: 'p1', mode: 'geo', url: 'https://a.com' })).toBe(
      '/scan?projectId=p1&mode=geo&url=https%3A%2F%2Fa.com',
    )
    expect(paths.routes.scanLaunch({ mode: 'seo' })).toBe('/scan?mode=seo')
    expect(paths.routes.scanLaunch({ mode: 'single' })).toBe('/scan?mode=single')
    expect(paths.routes.scanLaunch({ mode: 'deep' })).toBe('/scan?mode=deep')
  })
})
