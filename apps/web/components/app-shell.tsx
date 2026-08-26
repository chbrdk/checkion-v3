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
  shellFrameStyle,
  type RailDockEdge,
} from '../lib/msqdx-ui-shell'
import { Avatar } from '@msqdx/ui'
import {
  NavIconOverview,
  NavIconProjects,
  NavIconResults,
  NavIconScan,
} from './nav-icons'
import {
  JobNotificationCenterPanel,
  JobsRailIcon,
  useJobNotifications,
} from './job-notification-center'
import { PlatformAssistantHost } from './platform-assistant-host'
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
  description,
}: {
  children: ReactNode
  /** Optional in-page lead under the rail chrome (not a global topbar). */
  description?: string
  /** @deprecated Global AppShell topbar removed — ignored. */
  title?: string | null
  /** @deprecated Global AppShell topbar removed — ignored. */
  actions?: ReactNode
  /** @deprecated Global AppShell topbar removed — ignored. */
  status?: ReactNode
}) {
  const pathname = usePathname()
  const { displayName } = useUserPrefs()
  const [railEdge, setRailEdge] = useState<RailDockEdge>(paths.railDockEdge)
  const [jobsOpen, setJobsOpen] = useState(false)
  const { jobs, runningCount } = useJobNotifications()
  const failedCount = jobs.filter((job) => job.status === 'failed').length

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

  const jobsAria =
    runningCount > 0
      ? `Jobs, ${runningCount} running`
      : failedCount > 0
        ? `Jobs, ${failedCount} failed`
        : 'Jobs'

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
              id: 'jobs',
              label: 'Jobs',
              active: jobsOpen,
              ariaLabel: jobsAria,
              title: jobsAria,
              icon: <JobsRailIcon runningCount={runningCount} failedCount={failedCount} />,
              onClick: () => setJobsOpen((value) => !value),
            },
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
    >
      <JobNotificationCenterPanel
        open={jobsOpen}
        onClose={() => setJobsOpen(false)}
        railEdge={railEdge}
      />
      <div className="app-main checkion-stage">
        {description ? <p className="checkion-page-lead">{description}</p> : null}
        {children}
      </div>
      <PlatformAssistantHost />
    </AppFrame>
  )
}
