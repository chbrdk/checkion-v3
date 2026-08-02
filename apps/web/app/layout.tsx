import './globals.css'
import type { Metadata } from 'next'
import { AppProviders } from '../components/app-providers'
import { paths } from '../lib/paths'

export const metadata: Metadata = {
  title: 'CHECKION v3',
  description: 'Spec-driven quality island on @msqdx/ui',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={paths.defaultLocale} data-theme={paths.defaultTheme} suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
