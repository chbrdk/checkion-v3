'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  AppFrame,
  BrandCorner,
  MsqdxLogoMark,
  NavRail,
  PageTitle,
  shellFrameStyle,
  type RailDockEdge,
} from '../lib/msqdx-ui-shell'
import { Avatar } from '@msqdx/ui'
import { NavIconOverview, NavIconProjects, NavIconResults, NavIconScan } from './nav-icons'
import { paths } from '../lib/paths'
import { useUserPrefs } from '../lib/user-prefs'

const PRIMARY_NAV = [
  { id: 'home', href: paths.routes.home, label: 'Home', icon: <NavIconOverview /> },
  { id: 'scan', href: paths.routes.scan, label: 'Scan', icon: <NavIconScan /> },
  { id: 'projects', href: paths.routes.projects, label: 'Projects', icon: <NavIconProjects /> },
  { id: 'results', href: paths.routes.results, label: 'Results', icon: <NavIconResults /> },
]

export function AppShell({
  children,
  title,
  description,
  actions,
  status,
}: {
  children: ReactNode
  title?: string | null
  description?: string
  actions?: ReactNode
  status?: ReactNode
}) {
  const pathname = usePathname()
  const { displayName } = useUserPrefs()
  const [railEdge, setRailEdge] = useState<RailDockEdge>(paths.railDockEdge)

  const frameStyle = useMemo(
    () =>
      shellFrameStyle({
        railInsetRem: paths.railInsetRem,
        railGapRem: paths.railGapRem,
        railWidthRem: paths.railWidthRem,
        mainGutterRem: paths.mainGutterRem,
      }),
    [],
  )

  function isActive(href: string): boolean {
    return href === '/' ? pathname === href : pathname.startsWith(href)
  }

  return (
    <AppFrame
      railEdge={railEdge}
      style={frameStyle}
      brandCorner={<BrandCorner label={paths.brandLabel} borderRadius={paths.brandCornerRadiusPx} />}
      rail={
        <NavRail
          dockable
          dockStorageKey={paths.railDockStorageKey}
          defaultDockEdge={paths.railDockEdge}
          onDockEdgeChange={setRailEdge}
          logo={<MsqdxLogoMark size={26} title="MSQ DX" />}
          logoLabel={`${paths.brandLabel} home`}
          linkComponent={Link}
          items={PRIMARY_NAV.map((item) => ({ ...item, active: isActive(item.href) }))}
          footerItems={[
            {
              id: 'settings',
              label: 'Settings',
              href: paths.routes.settings,
              active: isActive(paths.routes.settings),
              ariaLabel: 'Settings',
              icon: <Avatar name={displayName} size="sm" className="rail-avatar" />,
            },
          ]}
        />
      }
      topbar={
        <>
          <div className="topbar-brand">
            {title != null && title !== '' ? <PageTitle>{title}</PageTitle> : null}
          </div>
          <div className="topbar-right">
            {status}
            {actions}
          </div>
        </>
      }
    >
      <div className="app-main checkion-stage">
        {description ? <p className="checkion-page-lead">{description}</p> : null}
        {children}
      </div>
    </AppFrame>
  )
}
