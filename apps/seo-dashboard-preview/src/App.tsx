import { useCallback, useEffect, useMemo, useState } from 'react'
import { SectionChrome } from '@msqdx/ui'
import type { SeoChapterId, SeoChapterViewModel } from '@checkion-v3/contracts'
import { SeoDashboardView } from '../../web/components/seo-dashboard-view'
import { SeoChapterView } from '../../web/components/seo-chapter-view'
import { SeoChapterNav } from '../../web/components/seo-chapter-nav'
import { fixtureSeoDashboard } from '../../web/lib/seo-market/dashboard-fixtures'
import {
  fixtureSeoChapter,
  SEO_CHAPTER_IDS,
} from '../../web/lib/seo-market/chapter-fixtures'
import { buildKeywordsChapterModel } from '../../web/lib/seo-market/keywords-chapter-map'
import { buildDomainChapterModel } from '../../web/lib/seo-market/domain-chapter-map'
import { buildRankChapterModel } from '../../web/lib/seo-market/rank-chapter-map'

type PreviewSurface = 'overview' | SeoChapterId

const META = {
  projectId: 'preview-acme',
  projectName: 'Acme Demo',
  domain: 'acme.example',
}

function parseHash(): PreviewSurface {
  const raw = window.location.hash.replace(/^#/, '').trim()
  if (!raw || raw === 'overview') return 'overview'
  if ((SEO_CHAPTER_IDS as string[]).includes(raw)) return raw as SeoChapterId
  // Map path-like More details hrefs: /projects/.../seo/gsc
  const match = raw.match(/\/seo\/([a-z-]+)/)
  if (match && (SEO_CHAPTER_IDS as string[]).includes(match[1]!)) {
    return match[1] as SeoChapterId
  }
  return 'overview'
}

function chapterFromHref(href: string): PreviewSurface | null {
  if (href.includes('/seo/keywords')) return 'keywords'
  if (href.includes('/seo/domain')) return 'domain'
  if (href.includes('/seo/backlinks')) return 'backlinks'
  if (href.includes('/seo/rank-tracking')) return 'rank-tracking'
  if (href.includes('/seo/competitors')) return 'competitors'
  if (href.includes('/seo/gsc')) return 'gsc'
  if (href.includes('/seo') && !href.includes('/seo/')) return 'overview'
  return null
}

export function App() {
  const [surface, setSurface] = useState<PreviewSurface>(() =>
    typeof window === 'undefined' ? 'overview' : parseHash(),
  )
  const [kwModel, setKwModel] = useState<SeoChapterViewModel>(() =>
    fixtureSeoChapter('keywords', META),
  )
  const [domainModel, setDomainModel] = useState<SeoChapterViewModel>(() =>
    fixtureSeoChapter('domain', META),
  )
  const [rankModel, setRankModel] = useState<SeoChapterViewModel>(() =>
    fixtureSeoChapter('rank-tracking', META),
  )

  useEffect(() => {
    setKwModel((prev) => ({
      ...fixtureSeoChapter('keywords', META),
      searchBand: prev.searchBand,
      lede: undefined,
    }))
    setDomainModel((prev) => ({
      ...fixtureSeoChapter('domain', META),
      searchBand: prev.searchBand,
      lede: undefined,
    }))
    setRankModel((prev) => ({
      ...fixtureSeoChapter('rank-tracking', META),
      searchBand: prev.searchBand,
      lede: undefined,
    }))
  }, [])

  useEffect(() => {
    const onHash = () => setSurface(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((next: PreviewSurface) => {
    setSurface(next)
    const hash = next === 'overview' ? '' : `#${next}`
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
  }, [])

  const onPreviewNavigate = useCallback(
    (href: string) => {
      const next = chapterFromHref(href)
      if (next) go(next)
    },
    [go],
  )

  const dashModel = useMemo(() => fixtureSeoDashboard(META), [])

  return (
    <main className="seo-dash-preview">
      <p className="seo-dash-preview__banner">
        Lokale Preview · Overview + Chapter-Details · Fixture · Port 5179 · Hash
        navigation (#gsc …)
      </p>
      <div className="checkion-seo-project seo-dash-preview__shell">
        <SectionChrome
          title={`${META.projectName} · SEO`}
        />
        <SeoChapterNav
          active={surface}
          onSelect={(id) => go(id as PreviewSurface)}
        />

        {surface === 'overview' ? (
          <SeoDashboardView
            model={dashModel}
            previewMode
            onPreviewNavigate={onPreviewNavigate}
          />
        ) : surface === 'keywords' ? (
          <SeoChapterView
            model={kwModel}
            onSearch={(query) => {
              const prev = kwModel.searchBand?.recent ?? []
              const recent = [
                query.seed,
                ...prev.filter((r) => r.toLowerCase() !== query.seed.toLowerCase()),
              ].slice(0, 6)
              setKwModel(
                buildKeywordsChapterModel({
                  ...META,
                  seed: query.seed,
                  locale: query.locale,
                  location: query.location,
                  recent,
                }),
              )
            }}
          />
        ) : surface === 'domain' ? (
          <SeoChapterView
            model={domainModel}
            onSearch={(query) => {
              const host = query.seed.trim() || META.domain
              const prev = domainModel.searchBand?.recent ?? []
              const recent = [
                host,
                ...prev.filter((r) => r.toLowerCase() !== host.toLowerCase()),
              ].slice(0, 6)
              setDomainModel(
                buildDomainChapterModel({
                  ...META,
                  seed: host,
                  locale: query.locale,
                  location: query.location,
                  recent,
                }),
              )
            }}
          />
        ) : surface === 'rank-tracking' ? (
          <SeoChapterView
            model={rankModel}
            onSearch={(query) => {
              const kw = query.seed.trim()
              const prev = rankModel.searchBand?.recent ?? []
              const recent = [
                kw,
                ...prev.filter((r) => r.toLowerCase() !== kw.toLowerCase()),
              ].slice(0, 6)
              setRankModel(
                buildRankChapterModel({
                  ...META,
                  seed: kw,
                  locale: query.locale,
                  location: query.location,
                  recent,
                }),
              )
            }}
          />
        ) : (
          <SeoChapterView
            model={fixtureSeoChapter(surface, META)}
          />
        )}
      </div>
    </main>
  )
}
