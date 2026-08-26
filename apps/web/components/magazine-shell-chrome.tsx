'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Chip, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { decodeVirtualCorpusLede } from '../lib/virtual-domain-page-scan'
import { useT } from '../lib/user-prefs'

function localizeDeck(
  deck: string | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null | undefined {
  if (!deck) return deck
  const url = decodeVirtualCorpusLede(deck)
  if (url) return t('results.virtualCorpusLede', { url })
  return deck
}

export function ResultMagazineChrome({
  tone,
  projectId,
  projectName,
  scanId,
  overallScore,
  issueCount,
  issueStats,
  scoreFallback,
  host,
  title,
  titleIsHome = false,
  deck,
  tags,
  variant,
  fromAudionHint,
  actions,
}: {
  tone?: string
  projectId: string
  projectName: string
  scanId: string
  overallScore: number | null
  issueCount: number
  issueStats?: { errors: number; warnings: number; passed: number } | null
  scoreFallback: Array<{ kind: string; label: string; value: number }>
  host: string
  title: string
  titleIsHome?: boolean
  deck: string | null | undefined
  tags?: string[]
  variant: 'cover' | 'folio'
  fromAudionHint?: ReactNode
  actions?: ReactNode
}) {
  const t = useT()
  const scoreDisplay = overallScore ?? t('results.scoreNone')
  const displayTitle = titleIsHome ? t('nav.home') : title
  const displayDeck = localizeDeck(deck, t)

  return (
    <>
      <div className="checkion-magazine-topbar">
        <nav className="briefing-nav signal-nav" aria-label={t('common.breadcrumb')}>
          <Link href={paths.routes.home}>{t('nav.home')}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <Link href={paths.routes.projectDetail(projectId)}>{projectName}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <span>{scanId}</span>
        </nav>
        {actions ? <div className="checkion-magazine-topbar-actions">{actions}</div> : null}
      </div>

      <header className="checkion-masthead" data-tone={tone} data-variant={variant}>
        <div className="checkion-masthead__hero">
          <div className="checkion-cover__score-col">
            <div
              className="checkion-cover__score"
              aria-label={t('results.scoreAria', { score: scoreDisplay })}
            >
              <span className="checkion-cover__score-num">{overallScore ?? '—'}</span>
              <span className="checkion-cover__score-label">{t('results.overall')}</span>
            </div>
            <dl className="checkion-cover__metrics" aria-label={t('results.metricsAria')}>
              <div>
                <dt>{t('results.issues')}</dt>
                <dd>{issueCount}</dd>
              </div>
              {issueStats ? (
                <>
                  <div>
                    <dt>{t('results.errors')}</dt>
                    <dd>{issueStats.errors}</dd>
                  </div>
                  <div>
                    <dt>{t('results.warnings')}</dt>
                    <dd>{issueStats.warnings}</dd>
                  </div>
                  <div>
                    <dt>{t('results.passed')}</dt>
                    <dd>{issueStats.passed}</dd>
                  </div>
                </>
              ) : (
                <>
                  {scoreFallback.slice(0, 3).map((s) => (
                    <div key={s.kind}>
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </>
              )}
            </dl>
          </div>

          <div className="checkion-cover__copy">
            <p className="checkion-cover__host">{host}</p>
            <Text role="headline" as="h2" className="checkion-cover__title">
              {displayTitle}
            </Text>
            {variant === 'cover' ? (
              <>
                {displayDeck ? <p className="checkion-cover__deck">{displayDeck}</p> : null}
                {tags?.length ? (
                  <div className="checkion-chip-row checkion-cover__tags">
                    {tags.map((tag) => (
                      <Chip key={tag} static size="sm">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </header>
      {fromAudionHint}
    </>
  )
}

export function DomainMagazineChrome({
  tone,
  projectId,
  projectName,
  scanId,
  overallScore,
  pageCount,
  issueCount,
  errors,
  host,
  deck,
  tags,
  variant,
  actions,
}: {
  tone?: string
  projectId: string
  projectName: string
  scanId: string
  overallScore: number | null
  pageCount: number
  issueCount: number
  errors?: number | null
  host: string
  deck: string | null | undefined
  tags?: string[]
  variant: 'cover' | 'folio'
  actions?: ReactNode
}) {
  const t = useT()
  const scoreDisplay = overallScore ?? t('domain.scoreNone')
  const displayDeck = localizeDeck(deck, t)

  return (
    <>
      <div className="checkion-magazine-topbar">
        <nav className="briefing-nav signal-nav" aria-label={t('common.breadcrumb')}>
          <Link href={paths.routes.domain}>{t('domain.deepScans')}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <Link href={paths.routes.projectDetail(projectId)}>{projectName}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <span>{scanId}</span>
        </nav>
        {actions ? <div className="checkion-magazine-topbar-actions">{actions}</div> : null}
      </div>

      <header className="checkion-masthead" data-tone={tone} data-variant={variant}>
        <div className="checkion-masthead__hero">
          <div className="checkion-cover__score-col">
            <div
              className="checkion-cover__score"
              aria-label={t('domain.scoreAria', { score: scoreDisplay })}
            >
              <span className="checkion-cover__score-num">{overallScore ?? '—'}</span>
              <span className="checkion-cover__score-label">{t('domain.scoreLabel')}</span>
            </div>
            <dl className="checkion-cover__metrics" aria-label={t('domain.metricsAria')}>
              <div>
                <dt>{t('domain.pages')}</dt>
                <dd>{pageCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt>{t('domain.groups')}</dt>
                <dd>{issueCount}</dd>
              </div>
              {errors != null ? (
                <div>
                  <dt>{t('domain.errors')}</dt>
                  <dd>{errors.toLocaleString()}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="checkion-cover__copy">
            <p className="checkion-cover__kicker">{t('domain.kicker')}</p>
            <p className="checkion-cover__host">{host}</p>
            <Text role="headline" as="h2" className="checkion-cover__title">
              {t('domain.titlePages', { count: pageCount.toLocaleString() })}
            </Text>
            {variant === 'cover' ? (
              <>
                {displayDeck ? <p className="checkion-cover__deck">{displayDeck}</p> : null}
                {tags?.length ? (
                  <div className="checkion-chip-row checkion-cover__tags">
                    {tags.slice(0, 6).map((tag) => (
                      <Chip key={tag} static size="sm">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </header>
    </>
  )
}

export function GeoMagazineChrome({
  tone,
  projectId,
  projectName,
  jobId,
  overallScore,
  host,
  title,
  lede,
  models,
  variant,
  actions,
}: {
  tone?: string
  projectId: string
  projectName: string
  jobId: string
  overallScore: number | null
  host: string
  title: string
  lede?: string | null
  models: string[]
  variant: 'cover' | 'folio'
  actions?: ReactNode
}) {
  const t = useT()
  const scoreDisplay = overallScore ?? t('geo.scoreNone')

  return (
    <>
      <div className="checkion-magazine-topbar">
        <nav className="briefing-nav signal-nav" aria-label={t('common.breadcrumb')}>
          <Link href={paths.routes.geo}>{t('geo.navLabel')}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <Link href={paths.routes.projectDetail(projectId)}>{projectName}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            /
          </span>
          <span>{jobId}</span>
        </nav>
        {actions ? <div className="checkion-magazine-topbar-actions">{actions}</div> : null}
      </div>

      <header className="checkion-masthead" data-tone={tone} data-variant={variant}>
        <div className="checkion-masthead__hero">
          <div className="checkion-cover__score-col">
            <div
              className="checkion-cover__score"
              aria-label={t('geo.scoreAria', { score: scoreDisplay })}
            >
              <span className="checkion-cover__score-num">{overallScore ?? '—'}</span>
              <span className="checkion-cover__score-label">{t('geo.scoreLabel')}</span>
            </div>
          </div>
          <div className="checkion-cover__copy">
            <p className="checkion-cover__kicker">{t('geo.kicker')}</p>
            <p className="checkion-cover__host">{host}</p>
            <h2 className="checkion-cover__title">
              {variant === 'cover' ? t('geo.coverTitle') : title}
            </h2>
            {variant === 'cover' ? (
              <>
                {lede ? <p className="checkion-cover__deck">{lede}</p> : null}
                <div className="checkion-chip-row checkion-cover__tags">
                  {models.map((m) => (
                    <Chip key={m} static size="sm">
                      {m}
                    </Chip>
                  ))}
                </div>
              </>
            ) : (
              <p className="checkion-cover__deck checkion-cover__deck--folio">{title}</p>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
