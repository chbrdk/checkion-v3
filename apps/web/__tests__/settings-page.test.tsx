import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../components/app-shell'
import { SettingsPage } from '../components/settings-page'
import { UserPrefsProvider } from '../lib/user-prefs'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))

afterEach(() => {
  cleanup()
  try {
    localStorage?.removeItem?.(paths.displayNameStorageKey)
    localStorage?.removeItem?.(paths.themeStorageKey)
    localStorage?.removeItem?.(paths.localeStorageKey)
  } catch {
    /* jsdom storage may be stubbed */
  }
})

function withPrefs(ui: React.ReactNode) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

describe('app shell settings entry', () => {
  it('renders enabled settings link in the rail footer', () => {
    withPrefs(
      <AppShell title="Home">
        <div>Content</div>
      </AppShell>,
    )

    const settings = screen.getByRole('link', { name: /Settings/i })
    expect(settings).toHaveAttribute('href', paths.routes.settings)
    expect(settings).not.toHaveAttribute('aria-disabled', 'true')
  })
})

describe('settings page', () => {
  it('commits display name and shows shared bands', () => {
    withPrefs(
      <SettingsPage
        initialTokens={[]}
        plexonBase="http://localhost:3000"
        federationMode="dummy"
        dataSource="fixtures"
      />,
    )

    const input = screen.getByLabelText('Display name') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Christoph' } })
    fireEvent.blur(input)
    try {
      expect(localStorage.getItem(paths.displayNameStorageKey)).toBe('Christoph')
    } catch {
      expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe('Christoph')
    }

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'API tokens' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Federation' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign in/i })).toHaveAttribute(
      'href',
      paths.routes.login,
    )
    expect(screen.getByTestId('settings-token-create')).toBeInTheDocument()
    expect(screen.getByTestId('settings-federation')).toBeInTheDocument()
  })

  it('lists existing tokens', () => {
    withPrefs(
      <SettingsPage
        initialTokens={[
          {
            id: 'tok-1',
            label: 'CLI',
            prefix: 'checkion_abcd',
            createdAt: '2026-08-01T00:00:00.000Z',
            lastUsedAt: null,
          },
        ]}
        plexonBase="http://localhost:3000"
        federationMode="dummy"
        dataSource="fixtures"
      />,
    )

    expect(screen.getByText('CLI')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Revoke/i })).toBeInTheDocument()
  })
})
