import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { GeoJobStatusPoller } from '../components/geo-job-status-poller'
import { paths } from '../lib/paths'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

describe('GeoJobStatusPoller', () => {
  afterEach(() => {
    refresh.mockReset()
    vi.unstubAllGlobals()
  })

  it('polls job detail and refreshes when status leaves queued', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ job: { status: 'completed' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<GeoJobStatusPoller jobId="geo-1" status="queued" />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiGeoJobDetail('geo-1'),
        expect.objectContaining({ cache: 'no-store' }),
      )
      expect(refresh).toHaveBeenCalled()
    })
  })

  it('does not poll when already completed', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<GeoJobStatusPoller jobId="geo-1" status="completed" />)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
