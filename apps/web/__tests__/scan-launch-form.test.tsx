import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  ScanLaunchForm,
  capabilityFromLaunchMode,
  defaultGeoQueries,
  initialCapability,
  initialWcagDepth,
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

  it('cold start leaves capability and depth unset; deep-links skip ahead', () => {
    expect(initialCapability(false)).toBeNull()
    expect(initialWcagDepth(false)).toBeNull()
    expect(initialCapability(false, 'seo')).toBe('seo')
    expect(initialWcagDepth(false, 'seo')).toBeNull()
    expect(initialCapability(false, 'single')).toBe('wcag')
    expect(initialWcagDepth(false, 'single')).toBe('single')
    expect(initialCapability(false, 'deep')).toBe('wcag')
    expect(initialWcagDepth(false, 'deep')).toBe('deep')
    expect(initialCapability(true)).toBe('wcag')
    expect(initialWcagDepth(true)).toBe('single')
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

  it('cold start shows capability tiles only until selection', () => {
    render(<ScanLaunchForm projects={projects} />)
    expect(screen.getByRole('heading', { name: /Start a run/i })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: /Capability/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /WCAG\./i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /GEO\./i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /SEO\./i })).toBeTruthy()
    const capabilityLabels = screen
      .getAllByRole('radio', { name: /^(WCAG|GEO|SEO)\./i })
      .map((el) => el.getAttribute('aria-label')?.split('.')[0])
    expect(capabilityLabels).toEqual(['WCAG', 'GEO', 'SEO'])
    expect(screen.getByRole('radio', { name: /WCAG\./i })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: /GEO\./i })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: /SEO\./i })).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Launch single scan/i })).toBeNull()
    expect(screen.queryByLabelText(/Scan URL/i)).toBeNull()
    expect(screen.queryByRole('navigation', { name: /Open fixture demos/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /SEO · domain-1/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /GEO · geo-1/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /WCAG · scan-single-1/i })).toBeNull()
  })

  it('reveals WCAG depth then compose after depth choice', () => {
    render(<ScanLaunchForm projects={projects} />)
    fireEvent.click(screen.getByRole('radio', { name: /WCAG\./i }))
    expect(screen.getByRole('radio', { name: /WCAG\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radiogroup', { name: /WCAG depth/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /Quick single scan/i })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.queryByRole('button', { name: /Launch single scan/i })).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: /Quick single scan/i }))
    expect(screen.getByRole('button', { name: /Launch single scan/i })).toBeTruthy()
    expect(screen.getByLabelText(/Scan URL/i)).toBeTruthy()
  })

  it('reveals WCAG depth only when WCAG is selected', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="seo" />)
    expect(screen.getByRole('radio', { name: /SEO\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Launch SEO crawl/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /WCAG\./i }))
    expect(screen.getByRole('radiogroup', { name: /WCAG depth/i })).toBeTruthy()
    // Depth not yet chosen this session for SEO→WCAG (no prior WCAG depth)
    expect(screen.queryByRole('button', { name: /Launch single scan/i })).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: /Deep scan/i }))
    expect(screen.getByRole('button', { name: /Launch deep scan/i })).toBeTruthy()
  })

  it('shows compose immediately when returning to WCAG with depth already chosen', () => {
    render(<ScanLaunchForm projects={projects} />)
    fireEvent.click(screen.getByRole('radio', { name: /WCAG\./i }))
    fireEvent.click(screen.getByRole('radio', { name: /Quick single scan/i }))
    expect(screen.getByRole('button', { name: /Launch single scan/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /SEO\./i }))
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Launch SEO crawl/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /WCAG\./i }))
    expect(screen.getByRole('radiogroup', { name: /WCAG depth/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /Quick single scan/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('button', { name: /Launch single scan/i })).toBeTruthy()
  })

  it('GEO deep-link skips ahead to full GEO compose without URL+Project row', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" />)
    expect(screen.getByRole('radio', { name: /GEO\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Start GEO job/i })).toBeTruthy()
    expect(screen.queryByLabelText(/Scan URL/i)).toBeNull()
    expect(screen.queryByLabelText(/^Project$/i)).toBeNull()
  })

  it('WCAG single deep-link skips ahead to depth + compose', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="single" />)
    expect(screen.getByRole('radio', { name: /WCAG\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radiogroup', { name: /WCAG depth/i })).toBeTruthy()
    expect(screen.getByRole('radio', { name: /Quick single scan/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('button', { name: /Launch single scan/i })).toBeTruthy()
  })

  it('shows GEO fields when GEO capability is selected', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" />)
    expect(screen.getByRole('button', { name: /Start GEO job/i })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^GEO queries$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /AI suggest GEO queries/i })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^GEO models$/i })).toBeTruthy()
    expect(screen.getByText(/GPT-5\.4 nano/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Remove GPT-5\.4 nano/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Suggest default GEO models/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add GEO model/i })).toBeTruthy()
    // Full catalog is not dumped as chips on the launch surface
    expect(screen.queryByRole('button', { name: /Claude Sonnet 5 \(Soon\)/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /GPT-5\.6 Luna \(Live\)/i })).toBeNull()
    expect(screen.getByRole('radio', { name: /GEO\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    // Magazine list rows — host defaults present as editable text buttons
    expect(screen.getByRole('button', { name: /Best alternatives to bosch-ebike/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add GEO query/i })).toBeTruthy()
    // URL + Project compose row stays off for GEO (WCAG/SEO still show it)
    expect(screen.queryByLabelText(/Scan URL/i)).toBeNull()
    expect(screen.queryByLabelText(/^Project$/i)).toBeNull()
  })

  it('keeps URL+Project row for WCAG and SEO', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="seo" />)
    expect(screen.getByLabelText(/Scan URL/i)).toBeTruthy()
    expect(screen.getByLabelText(/^Project$/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /WCAG\./i }))
    fireEvent.click(screen.getByRole('radio', { name: /Quick single scan/i }))
    expect(screen.getByLabelText(/Scan URL/i)).toBeTruthy()
    expect(screen.getByLabelText(/^Project$/i)).toBeTruthy()
  })

  it('adds GEO models via dialog search and Suggest restores default', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" />)
    fireEvent.click(screen.getByRole('button', { name: /Add GEO model/i }))
    expect(screen.getByRole('heading', { name: /Add model/i })).toBeTruthy()
    expect(screen.getByRole('group', { name: /Model provider/i })).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'luna' } })
    fireEvent.click(screen.getByRole('option', { name: /GPT-5\.6 Luna/i }))
    expect(screen.getByRole('option', { name: /GPT-5\.6 Luna/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: /^Anthropic$/i }))
    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'sonnet 5' } })
    fireEvent.click(screen.getByRole('option', { name: /Claude Sonnet 5/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Done$/i }))

    expect(screen.getByText(/GPT-5\.6 Luna/i)).toBeTruthy()
    expect(screen.getByText(/Claude Sonnet 5/i)).toBeTruthy()
    expect(screen.getByText(/1 Soon model/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Suggest default GEO models/i }))
    expect(screen.getByText(/GPT-5\.4 nano/i)).toBeTruthy()
    expect(screen.queryByText(/GPT-5\.6 Luna/i)).toBeNull()
    expect(screen.queryByText(/Claude Sonnet 5/i)).toBeNull()
  })

  it('adds and removes GEO query rows from the list', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" />)
    const before = screen.getAllByRole('button', { name: /Remove GEO query/i }).length
    fireEvent.click(screen.getByRole('button', { name: /Add GEO query/i }))
    expect(screen.getByLabelText(/Edit GEO query/i)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Edit GEO query/i), {
      target: { value: 'Custom GEO prompt' },
    })
    fireEvent.blur(screen.getByLabelText(/Edit GEO query/i))
    expect(screen.getByRole('button', { name: /Custom GEO prompt/i })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Remove GEO query/i }).length).toBe(before + 1)
    fireEvent.click(screen.getAllByRole('button', { name: /Remove GEO query/i })[0]!)
    expect(screen.getAllByRole('button', { name: /Remove GEO query/i }).length).toBe(before)
  })

  it('opens Suggest dialog and merges fixture suggestions', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/geo/suggest-queries')) {
        return {
          ok: true,
          json: async () => ({
            suggestions: [
              {
                id: 'fixture-1',
                title: 'Is bosch-ebike recommended for professional teams?',
                description: 'Host-derived',
              },
            ],
            source: 'fixture',
            stubbed: true,
          }),
        }
      }
      return { ok: true, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanLaunchForm projects={projects} defaultMode="geo" />)
    fireEvent.click(screen.getByRole('button', { name: /AI suggest GEO queries/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Suggest queries/i })).toBeTruthy()
    })
    expect(screen.getByText(/Fixture · host-derived/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }))
    expect(
      screen.getByRole('button', {
        name: /Is bosch-ebike recommended for professional teams/i,
      }),
    ).toBeTruthy()
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
    fireEvent.click(screen.getByRole('button', { name: /Add GEO model/i }))
    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'luna' } })
    fireEvent.click(screen.getByRole('option', { name: /GPT-5\.6 Luna/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Anthropic$/i }))
    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'sonnet 5' } })
    fireEvent.click(screen.getByRole('option', { name: /Claude Sonnet 5/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Done$/i }))
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
    // Live filter drops Anthropic; keeps OpenAI selection
    expect(body.models).toEqual(['gpt-5.4-nano', 'gpt-5.6-luna'])
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(paths.routes.geoSection('geo-new-1', 'overview'))
    })
  })

  it('posts GEO deep-link url and projectId silently without URL+Project row', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, jobId: 'geo-dl-1', status: 'completed' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ScanLaunchForm
        projects={projects}
        defaultMode="geo"
        defaultProjectId="proj-2"
        defaultUrl="https://acme.example/geo"
      />,
    )
    expect(screen.queryByLabelText(/Scan URL/i)).toBeNull()
    expect(screen.queryByLabelText(/^Project$/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Start GEO job/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = (fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock
      .calls[0]
    const body = JSON.parse(String(call?.[1]?.body)) as { projectId: string; url: string }
    expect(body.projectId).toBe('proj-2')
    expect(body.url).toBe('https://acme.example/geo')
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(paths.routes.geoSection('geo-dl-1', 'overview'))
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
