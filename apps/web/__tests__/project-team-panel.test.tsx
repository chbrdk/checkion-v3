import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProjectTeamPanel } from '../components/project-team-panel'
import { UserPrefsProvider } from '../lib/user-prefs'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

function renderTeam(ui: React.ReactElement) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

describe('ProjectTeamPanel compact add', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/members') && !url.includes('/invites')) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 'u-owner',
                  email: 'owner@example.com',
                  role: 'admin',
                  status: 'owner',
                },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        }
        return new Response(JSON.stringify({ error: 'unexpected' }), { status: 500 })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses magazine add-row draft instead of a persistent Field input', async () => {
    renderTeam(
      <ProjectTeamPanel
        projectId="proj-1"
        platformProjectId="a1b2c3d4-e5f6-4789-a012-3456789abcde"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('owner@example.com')).toBeTruthy()
    })

    expect(document.querySelector('.ds-field')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /add member/i }))

    const emailInput = await screen.findByRole('textbox', { name: /add member/i })
    expect(emailInput).toHaveClass('checkion-geo-query-list__input')
    expect(emailInput.getAttribute('placeholder')).toMatch(/@/)
  })

  it('shows Collection sync empty when unbound', () => {
    renderTeam(<ProjectTeamPanel projectId="proj-1" platformProjectId="plx-local-1" />)
    expect(screen.getByText(/sync this project to a plexon collection/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /add member/i })).toBeNull()
  })
})
