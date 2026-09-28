'use client'

import Link from 'next/link'
import { Button, EmptyState } from '@msqdx/ui'
import type { ProjectSeoPulse, ProjectSeoPulseMeterId } from '../lib/seo-market/project-seo-pulse'
import { useT } from '../lib/user-prefs'

const METER_LABEL_KEY: Record<ProjectSeoPulseMeterId, string> = {
  tracked: 'projects.seoPulseTracked',
  refDomains: 'projects.seoPulseRefDomains',
  organicKw: 'projects.seoPulseOrganicKw',
  gscClicks: 'projects.seoPulseGscClicks',
}

export function SeoPulseChapter({ pulse }: { pulse: ProjectSeoPulse }) {
  const t = useT()

  return (
    <section
      className="checkion-project-chapter"
      data-section="seo-pulse"
      aria-label={t('projects.seoPulseAria')}
    >
      <header className="checkion-project-chapter__head">
        <div>
          <p className="checkion-spread__eyebrow">{t('projects.seoPulseEyebrow')}</p>
          <h2 className="checkion-spread__headline">{t('projects.seoPulseTitle')}</h2>
          <p className="checkion-project-chapter__deck">{t('projects.seoPulseDeck')}</p>
        </div>
        <Link href={pulse.href}>
          <Button variant="ghost" size="sm">
            {t('projects.seoPulseCta')}
          </Button>
        </Link>
      </header>

      {!pulse.hasData ? (
        <EmptyState className="checkion-project-chapter__empty">
          {t('projects.seoPulseEmpty')}{' '}
          <Link href={pulse.href}>{t('projects.seoPulseEmptyCta')}</Link>.
        </EmptyState>
      ) : (
        <div className="checkion-project-pulse" aria-label={t('projects.seoPulseAria')}>
          {pulse.meters.map((meter) => (
            <div
              key={meter.id}
              className="checkion-project-pulse__meter"
              data-tone={meter.linked ? undefined : 'muted'}
            >
              <p className="checkion-project-pulse__value">{meter.value}</p>
              <p className="checkion-project-pulse__label">{t(METER_LABEL_KEY[meter.id])}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
