'use client'

import type { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { UserPrefsProvider } from '../lib/user-prefs'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UserPrefsProvider>{children}</UserPrefsProvider>
    </SessionProvider>
  )
}
