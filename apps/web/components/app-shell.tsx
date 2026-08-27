'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  AppFrame,
  MsqdxLogoMark,
  NavRail,
  ShellBackButton,
  shellFrameStyle,
  type RailDockEdge,
} from '../lib/msqdx-ui-shell'
import { Avatar } from '@msqdx/ui'
import {
  NavIconOverview,
  NavIconProjects,
  NavIconScan,
} from './nav-icons'
import {
  JobNotificationCenterPanel,
  JobsRailIcon,
  useJobNotifications,
} from './job-notification-center'
import { PlatformAssistantHost } from './platform-assistant-host'
import { ShellBrandCorner } from './shell-brand-corner'
import { paths } from '../lib/paths'
import { useUserPrefs } from '../lib/user-prefs'

export function AppShell({
  children,
  description,
  descriptionKey,
}: {
  children: ReactNode
  /** Optional in-page lead under the rail chrome (not a global topbar). */
  description?: string
  /** Prefer over `description` — resolves via locale dictionary. */
  descriptionKey?: string
  /** @deprecated Global AppShell topbar removed — ignored. */
  title?: string | null
  /** @deprecated Global AppShell topbar removed — ignored. */
  actions?: ReactNode
  /** @deprecated Global AppShell topbar removed — ignored. */
  status?: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { displayName, t } = useUserPrefs()
  const pageLead = descriptionKey ? t(descriptionKey) : description
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

  const primaryNav = useMemo(
    () => [
      { id: 'home', href: paths.routes.home, label: t('nav.home'), icon: <NavIconOverview /> },
      { id: 'scan', href: paths.routes.scan, label: t('nav.scan'), icon: <NavIconScan /> },
      {
        id: 'projects',
        href: paths.routes.projects,
        label: t('nav.projects'),
        icon: <NavIconProjects />,
      },
    ],
    [t],
  )

  const jobsAria =
    runningCount > 0
      ? t('nav.jobsRunning', { count: runningCount })
      : failedCount > 0
        ? t('nav.jobsFailed', { count: failedCount })
        : t('nav.jobs')

  return (
    <AppFrame
      railEdge={railEdge}
      style={frameStyle}
      backCorner={<ShellBackButton label={t('nav.back')} onClick={() => router.back()} />}
      brandCorner={<ShellBrandCorner />}
      rail={
        <NavRail
          dockable
          dockStorageKey={paths.railDockStorageKey}
          defaultDockEdge={paths.railDockEdge}
          onDockEdgeChange={setRailEdge}
          logo={<MsqdxLogoMark size={26} title="MSQ DX" />}
          logoLabel={t('nav.homeAria', { brand: paths.brandLabel })}
          linkComponent={Link}
          items={primaryNav.map((item) => ({ ...item, active: isActive(item.href) }))}
          footerItems={[
            {
              id: 'jobs',
              label: t('nav.jobs'),
              active: jobsOpen,
              ariaLabel: jobsAria,
              title: jobsAria,
              icon: <JobsRailIcon runningCount={runningCount} failedCount={failedCount} />,
              onClick: () => setJobsOpen((value) => !value),
            },
            {
              id: 'settings',
              label: t('nav.settings'),
              href: paths.routes.settings,
              active: isActive(paths.routes.settings),
              ariaLabel: t('nav.settingsAria'),
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
        {pageLead ? <p className="checkion-page-lead">{pageLead}</p> : null}
        {children}
      </div>
      <PlatformAssistantHost />
    </AppFrame>
  )
}
