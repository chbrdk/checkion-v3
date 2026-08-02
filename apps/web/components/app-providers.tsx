'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import { paths } from '../lib/paths'

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(paths.themeStorageKey)
    const theme = stored && (paths.themeChoices as readonly string[]).includes(stored)
      ? stored
      : paths.defaultTheme
    document.documentElement.setAttribute('data-theme', theme)
    setReady(true)
  }, [])

  return (
    <SessionProvider>
      {ready ? children : children}
    </SessionProvider>
  )
}
