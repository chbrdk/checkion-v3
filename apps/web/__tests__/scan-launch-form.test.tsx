import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  ScanLaunchForm,
  capabilityFromLaunchMode,
  defaultGeoQueries,
  initialCapability,
  initialGeoMeasurements,
  initialProjectId,
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
    expect(initialGeoMeasurements(false, 'geo')).toEqual([])
    expect(initialGeoMeasurements(false, 'geo', 'live')).toEqual(['live'])
    expect(initialGeoMeasurements(false, 'geo', undefined, ['recall', 'live'])).toEqual([
      'recall',
      'live',
    ])
  })

  it('GEO starts with empty projectId unless deep-linked; WCAG/SEO pick first', () => {
    expect(initialProjectId(projects, { defaultMode: 'geo' })).toBe('')
    expect(initialProjectId(projects, { defaultMode: 'geo', defaultProjectId: 'proj-2' })).toBe(
      'proj-2',
    )
    expect(initialProjectId(projects, { defaultMode: 'seo' })).toBe('proj-1')
    expect(initialProjectId(projects, { defaultMode: 'single' })).toBe('proj-1')
    expect(initialProjectId(projects, {})).toBe('proj-1')
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

  it('GEO mode=geo alone keeps measurement step (no compose yet)', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" />)
    expect(screen.getByRole('radio', { name: /GEO\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('group', { name: /GEO measurement/i })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /Model memory\./i })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.queryByRole('button', { name: /Start GEO job/i })).toBeNull()
    expect(screen.queryByLabelText(/Scan URL/i)).toBeNull()
  })

  it('GEO measurement deep-link skips ahead to full GEO compose with URL+Company+Project', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
    expect(screen.getByRole('radio', { name: /GEO\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    expect(screen.getByRole('group', { name: /GEO measurement/i })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /Model memory\./i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('button', { name: /Start GEO job/i })).toBeTruthy()
    expect(screen.getByLabelText(/Scan URL/i)).toBeTruthy()
    expect(screen.getByLabelText(/Company name/i)).toBeTruthy()
    expect(screen.getByLabelText(/^Project$/i)).toBeTruthy()
  })

  it('cold GEO reveals measurement tiles before compose', () => {
    render(<ScanLaunchForm projects={projects} />)
    fireEvent.click(screen.getByRole('radio', { name: /GEO\./i }))
    expect(screen.getByRole('group', { name: /GEO measurement/i })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /Model memory\./i })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.queryByRole('button', { name: /Start GEO job/i })).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: /Live search\./i }))
    expect(screen.getByRole('button', { name: /Start GEO job/i })).toBeTruthy()
    expect(screen.getByLabelText(/Scan URL/i)).toBeTruthy()
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
    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
    expect(screen.getByRole('button', { name: /Start GEO job/i })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^GEO queries$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /AI suggest GEO queries/i })).toBeTruthy()
    expect(screen.getByRole('group', { name: /^GEO models$/i })).toBeTruthy()
    expect(screen.getByText(/GPT-5\.6 Luna/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Remove GPT-5\.6 Luna/i })).toBeTruthy()
    expect(screen.getByText(/Claude Sonnet 5/i)).toBeTruthy()
    expect(screen.getByText(/Gemini 3\.6 Flash/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Suggest default GEO models/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add GEO model/i })).toBeTruthy()
    // Full catalog is not dumped as chips on the launch surface (Soon entries stay in Add dialog)
    expect(screen.queryByRole('button', { name: /Claude Opus 5 \(Soon\)/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /GPT-5\.6 Luna \(Live\)/i })).toBeNull()
    expect(screen.getByRole('radio', { name: /GEO\./i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('radiogroup', { name: /WCAG depth/i })).toBeNull()
    expect(screen.getByRole('group', { name: /GEO measurement/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Best alternatives to bosch-ebike/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add GEO query/i })).toBeTruthy()
    // URL · Company · Project compose row is visible for GEO
    expect(screen.getByLabelText(/Scan URL/i)).toBeTruthy()
    expect(screen.getByLabelText(/Company name/i)).toBeTruthy()
    expect(screen.getByLabelText(/^Project$/i)).toBeTruthy()
  })

  it('keeps URL+Project row for WCAG and SEO without company field', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="seo" />)
    expect(screen.getByLabelText(/Scan URL/i)).toBeTruthy()
    expect(screen.getByLabelText(/^Project$/i)).toBeTruthy()
    expect(screen.queryByLabelText(/Company name/i)).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: /WCAG\./i }))
    fireEvent.click(screen.getByRole('radio', { name: /Quick single scan/i }))
    expect(screen.getByLabelText(/Scan URL/i)).toBeTruthy()
    expect(screen.getByLabelText(/^Project$/i)).toBeTruthy()
    expect(screen.queryByLabelText(/Company name/i)).toBeNull()
  })

  it('requires URL or company name before GEO start', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
    fireEvent.change(screen.getByLabelText(/Scan URL/i), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: '' } })
    expect(screen.getByText(/Provide a URL or company name/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Start GEO job/i })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: 'Acme Robotics' } })
    expect(screen.queryByText(/Provide a URL or company name/i)).toBeNull()
    expect(screen.getByRole('button', { name: /Start GEO job/i })).not.toBeDisabled()
  })

  it('GEO project defaults empty with placeholder and New project affordance', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
    const projectTrigger = screen.getByRole('combobox', { name: /^Project$/i })
    expect(projectTrigger).toHaveTextContent(/Select or create project/i)
    expect(screen.getByRole('button', { name: /\+ New project/i })).toBeTruthy()
    expect(screen.getByText(/No project selected — Start will auto-create/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Start GEO job/i })).not.toBeDisabled()
  })

  it('opens New project dialog from GEO compose', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: 'Acme Robotics' } })
    fireEvent.click(screen.getByRole('button', { name: /\+ New project/i }))
    expect(screen.getByRole('heading', { name: /New project/i })).toBeTruthy()
    expect(screen.getByLabelText(/Project name/i)).toHaveValue('Acme Robotics')
  })

  it('adds GEO models via dialog search and Suggest restores default', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
    fireEvent.click(screen.getByRole('button', { name: /Add GEO model/i }))
    expect(screen.getByRole('heading', { name: /Add model/i })).toBeTruthy()
    expect(screen.getByRole('group', { name: /Model provider/i })).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'nano' } })
    fireEvent.click(screen.getByRole('option', { name: /GPT-5\.4 nano/i }))
    expect(screen.getByRole('option', { name: /GPT-5\.4 nano/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: /^Anthropic$/i }))
    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'opus 5' } })
    fireEvent.click(screen.getByRole('option', { name: /Claude Opus 5/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Google$/i }))
    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: '2.5 flash' } })
    fireEvent.click(screen.getByRole('option', { name: /Gemini 2\.5 Flash/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Done$/i }))

    expect(screen.getByText(/GPT-5\.4 nano/i)).toBeTruthy()
    expect(screen.getByText(/Claude Opus 5/i)).toBeTruthy()
    expect(screen.getByText(/1 Soon model/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Suggest default GEO models/i }))
    expect(screen.getByText(/GPT-5\.6 Luna/i)).toBeTruthy()
    expect(screen.getByText(/Claude Sonnet 5/i)).toBeTruthy()
    expect(screen.getByText(/Gemini 3\.6 Flash/i)).toBeTruthy()
    expect(screen.queryByText(/Claude Opus 5/i)).toBeNull()
    expect(screen.queryByText(/GPT-5\.4 nano/i)).toBeNull()
  })

  it('adds and removes GEO query rows from the list', () => {
    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
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

    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
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

  it('posts GEO job without projectId when none selected (API auto-creates)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        jobId: 'geo-new-1',
        status: 'completed',
        projectId: 'proj-auto-1',
      }),
    })) as unknown as typeof fetch & { mock: { calls: Array<[unknown, RequestInit?]> } }
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: 'Bosch eBike' } })
    fireEvent.click(screen.getByRole('button', { name: /Add GEO model/i }))
    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'nano' } })
    fireEvent.click(screen.getByRole('option', { name: /GPT-5\.4 nano/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Anthropic$/i }))
    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: 'opus 5' } })
    fireEvent.click(screen.getByRole('option', { name: /Claude Opus 5/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Done$/i }))
    fireEvent.click(screen.getByRole('button', { name: /Start GEO job/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    const call = (fetchMock as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock.calls[0]
    expect(call?.[0]).toBe(paths.routes.apiGeoJobs)
    expect(call?.[1]?.method).toBe('POST')
    const body = JSON.parse(String(call?.[1]?.body)) as {
      projectId?: string
      url: string
      companyName?: string
      queries: string[]
      models: string[]
      measurement?: string
    }
    expect(body.projectId).toBeUndefined()
    expect(body.measurement).toBe('recall')
    expect(body.url).toContain('http')
    expect(body.companyName).toBe('Bosch eBike')
    expect(body.queries.length).toBeGreaterThan(0)
    expect(body.models).toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-5.6-sol',
      'claude-sonnet-5',
      'gemini-3.6-flash',
      'gpt-5.4-nano',
      'claude-opus-5',
    ])
    await waitFor(() => {
      expect(push).not.toHaveBeenCalled()
    })
  })

  it('posts GEO job with explicit project when selected', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, jobId: 'geo-sel-1', status: 'completed' }),
    })) as unknown as typeof fetch & { mock: { calls: Array<[unknown, RequestInit?]> } }
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" defaultProjectId="proj-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Start GEO job/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(
      String(
        (fetchMock as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock.calls[0]?.[1]
          ?.body,
      ),
    ) as { projectId: string }
    expect(body.projectId).toBe('proj-1')
  })

  it('posts measurement=live when Live search is selected', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, jobId: 'geo-live-1', status: 'queued' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="live" />,
    )
    expect(screen.getByRole('checkbox', { name: /Live search\./i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: /Start GEO job/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(
      String(
        (fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock.calls[0]?.[1]
          ?.body,
      ),
    ) as { measurement?: string }
    expect(body.measurement).toBe('live')
  })

  it('posts two GEO jobs when both layers are selected', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, jobId: `geo-${fetchMock.mock.calls.length}`, status: 'queued' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ScanLaunchForm
        projects={projects}
        defaultMode="geo"
        defaultMeasurements={['recall', 'live']}
      />,
    )
    expect(screen.getByRole('button', { name: /Start GEO jobs/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Start GEO jobs/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const measurements = (
      fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }
    ).mock.calls.map((call) => {
      const body = JSON.parse(String(call[1]?.body)) as { measurement?: string }
      return body.measurement
    })
    expect(measurements).toEqual(['recall', 'live'])
  })

  it('posts GEO deep-link url and projectId on visible compose row', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, jobId: 'geo-dl-1', status: 'completed' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ScanLaunchForm
        projects={projects}
        defaultMode="geo" defaultMeasurement="recall"
        defaultProjectId="proj-2"
        defaultUrl="https://acme.example/geo"
      />,
    )
    expect(screen.getByLabelText(/Scan URL/i)).toHaveValue('https://acme.example/geo')
    expect(screen.getByLabelText(/^Project$/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Start GEO job/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = (fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock
      .calls[0]
    const body = JSON.parse(String(call?.[1]?.body)) as { projectId: string; url: string }
    expect(body.projectId).toBe('proj-2')
    expect(body.url).toBe('https://acme.example/geo')
    await waitFor(() => {
      expect(push).not.toHaveBeenCalled()
    })
  })

  it('posts company-only GEO launch with derived url and omits projectId when empty', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, jobId: 'geo-co-1', status: 'completed' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanLaunchForm projects={projects} defaultMode="geo" defaultMeasurement="recall" />)
    fireEvent.change(screen.getByLabelText(/Scan URL/i), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: 'Acme Robotics' } })
    fireEvent.click(screen.getByRole('button', { name: /Start GEO job/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(
      String(
        (fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock.calls[0]?.[1]
          ?.body,
      ),
    ) as { projectId?: string; url: string; companyName: string }
    expect(body.projectId).toBeUndefined()
    expect(body.companyName).toBe('Acme Robotics')
    expect(body.url).toBe('https://acme-robotics.example/')
    await waitFor(() => {
      expect(push).not.toHaveBeenCalled()
    })
  })

  it('allows GEO start with empty projects and surfaces API detail', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'project_required',
        detail: 'Could not auto-create a Collection project for GEO',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanLaunchForm projects={[]} defaultMode="geo" defaultMeasurement="recall" />)
    expect(screen.getByText(/No project selected — Start will auto-create/i)).toBeTruthy()
    const start = screen.getByRole('button', { name: /Start GEO job/i })
    expect(start).not.toBeDisabled()
    fireEvent.click(start)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(
      String(
        (fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock.calls[0]?.[1]
          ?.body,
      ),
    ) as { projectId?: string; url: string; queries: string[] }
    expect(body.projectId).toBeUndefined()
    expect(body.url).toContain('http')
    expect(body.queries.length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(screen.getByText(/Could not auto-create a Collection project for GEO/i)).toBeTruthy()
    })
  })

  it('passes company and project context into Suggest', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const reqUrl = String(input)
      if (reqUrl.includes('/api/geo/suggest-queries')) {
        return {
          ok: true,
          json: async () => ({
            suggestions: [
              {
                id: 'fixture-1',
                title: 'Is Acme recommended for professional teams?',
                description: 'Brand-derived',
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

    render(
      <ScanLaunchForm
        projects={[{ id: 'proj-1', name: 'Demo Project', domain: 'demo.example' }]}
        defaultMode="geo" defaultMeasurement="recall"
        defaultProjectId="proj-1"
        defaultUrl="https://acme.example/"
      />,
    )
    fireEvent.change(screen.getByLabelText(/Company name/i), { target: { value: 'Acme' } })
    fireEvent.click(screen.getByRole('button', { name: /AI suggest GEO queries/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    const suggestCall = (
      fetchMock as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }
    ).mock.calls.find((c) => String(c[0]).includes('/api/geo/suggest-queries'))
    const body = JSON.parse(String(suggestCall?.[1]?.body)) as {
      url: string
      companyName: string
      project: { name: string; domain: string }
    }
    expect(body.url).toBe('https://acme.example/')
    expect(body.companyName).toBe('Acme')
    expect(body.project).toEqual({ name: 'Demo Project', domain: 'demo.example' })
  })

  it('posts SEO domain crawl without forcing a route change', async () => {
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
      expect(push).not.toHaveBeenCalled()
    })
  })

  it('posts single scan without forcing a route change', async () => {
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
      expect(push).not.toHaveBeenCalled()
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
    expect(paths.routes.scanLaunch({ mode: 'geo', measurement: 'live' })).toBe(
      '/scan?mode=geo&measurement=live',
    )
    expect(paths.routes.scanLaunch({ mode: 'geo', measurement: 'both' })).toBe(
      '/scan?mode=geo&measurement=both',
    )
  })
})
