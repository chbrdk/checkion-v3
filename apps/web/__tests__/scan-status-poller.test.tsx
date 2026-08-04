import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { ScanStatusPoller } from '../components/scan-status-poller'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

describe('ScanStatusPoller', () => {
  beforeEach(() => {
    refresh.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('polls scan detail and refreshes when status changes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'running' }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<ScanStatusPoller scanId="scan-1" status="queued" />)

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled()
    })
  })

  it('does not poll completed scans', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ScanStatusPoller scanId="scan-1" status="completed" />)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

