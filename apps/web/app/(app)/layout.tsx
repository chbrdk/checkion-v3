import type { ReactNode } from 'react'
import { AppShell } from '../../components/app-shell'

/**
 * Persistent chrome for authenticated app routes.
 * Login / share / api stay outside this group so Soft-Nav does not remount the rail.
 */
export default function AppRouteLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
