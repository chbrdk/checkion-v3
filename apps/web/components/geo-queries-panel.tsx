'use client'

import { useEffect, useMemo, useState } from 'react'
import type { GeoAnswerCellAnalysis, GeoOverview, GeoQueryRun } from '@checkion-v3/contracts'
import { buildPromptReadingFallback, groupRunsByQuery } from '../lib/geo-readings'
import { findCellAnalysis, findDisagreement, findIntent } from '../lib/geo-insights'
import { GeoReading } from './geo-reading'
import { MarkdownProse } from '../lib/msqdx-ui'
import { normalizeGeoHost } from '../lib/geo-presence'

function outcomeTone(outcome: string): 'pos' | 'low' | 'neg' {
  if (outcome === 'win') return 'pos'
  if (outcome === 'tie' || outcome === 'solo') return 'low'
  return 'neg'
}

function AnswerDetail({
  run,
  cell,
  targetHost,
}: {
  run: GeoQueryRun
  cell: GeoAnswerCellAnalysis | undefined
  targetHost: string
}) {
  const target = normalizeGeoHost(targetHost)
  const miss = cell?.targetPosition == null

  return (
    <article
      className="checkion-geo-answer"
      data-stolen={cell?.stolenBy ? 'true' : undefined}
      data-miss={miss ? 'true' : undefined}
    >
      <header className="checkion-geo-answer__head">
        <span className="checkion-geo-answer__model">{run.modelId}</span>
        <span className="checkion-geo-answer__pos" data-miss={miss ? 'true' : undefined}>
          {miss ? 'miss' : `#${cell!.targetPosition}`}
        </span>
        {cell?.stolenBy ? (
          <span className="checkion-geo-answer__stolen">{cell.stolenBy} leads</span>
        ) : null}
        {cell?.coCited ? <span className="checkion-geo-answer__flag">co-cited</span> : null}
      </header>

      <MarkdownProse as="blockquote" className="checkion-geo-answer__prose">
        {run.answerText}
      </MarkdownProse>

      {run.searchQueries && run.searchQueries.length > 0 ? (
        <div className="checkion-geo-answer__searches">
          <p className="checkion-geo-answer__cites-k">Search queries</p>
          <ul className="checkion-geo-answer__search-list" aria-label="Provider search queries">
            {run.searchQueries.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {cell && cell.citationStack.length > 0 ? (
        <div className="checkion-geo-answer__cites">
          <p className="checkion-geo-answer__cites-k">Cite stack</p>
          <ol className="checkion-geo-answer__rail" aria-label="Citation order">
            {cell.citationStack.map((c) => (
              <li
                key={`${c.domain}-${c.position}`}
                data-role={
                  c.domain === target
                    ? 'you'
                    : cell.rivalDomains.includes(c.domain)
                      ? 'rival'
                      : 'other'
                }
              >
                <span className="checkion-geo-answer__rail-pos">{c.position}</span>
                <span className="checkion-geo-answer__rail-host">{c.domain}</span>
                {c.context ? (
                  <span className="checkion-geo-answer__rail-ctx">{c.context}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="checkion-geo-answer__empty">No citations in this answer.</p>
      )}
    </article>
  )
}

function ModelPlacementStrip({
  runs,
  insights,
  activeModelId,
  onSelect,
  preferredModel,
}: {
  runs: GeoQueryRun[]
  insights: GeoOverview['insights']
  activeModelId: string
  onSelect: (modelId: string) => void
  preferredModel?: string
}) {
  return (
    <div className="checkion-geo-models">
      <div className="checkion-geo-models__head">
        <p className="checkion-spread__eyebrow">Placement by model</p>
        <span className="checkion-geo-models__count">{runs.length} models</span>
      </div>
      <ul className="checkion-geo-models__strip" aria-label="Model placement">
        {runs.map((run) => {
          const cell = findCellAnalysis(insights, run.queryId, run.modelId)
          const miss = cell?.targetPosition == null
          const selected = run.modelId === activeModelId
          return (
            <li key={run.modelId}>
              <button
                type="button"
                className="checkion-geo-models__cell"
                data-active={selected ? 'true' : undefined}
                data-miss={miss ? 'true' : undefined}
                data-preferred={
                  preferredModel === run.modelId && preferredModel !== activeModelId
                    ? 'true'
                    : undefined
                }
                aria-pressed={selected}
                aria-label={`${run.modelId}: ${miss ? 'not cited' : `position ${cell!.targetPosition}`}`}
                title={run.modelId}
                onClick={() => onSelect(run.modelId)}
              >
                <span className="checkion-geo-models__id">{run.modelId}</span>
                <span className="checkion-geo-models__rank" data-miss={miss ? 'true' : undefined}>
                  {miss ? '—' : `#${cell!.targetPosition}`}
                </span>
                {cell?.stolenBy ? (
                  <span className="checkion-geo-models__steal">{cell.stolenBy}</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function orderRuns(runs: GeoQueryRun[], modelOrder: string[]): GeoQueryRun[] {
  if (!modelOrder.length) return runs
  const byId = new Map(runs.map((r) => [r.modelId, r]))
  const ordered: GeoQueryRun[] = []
  for (const id of modelOrder) {
    const run = byId.get(id)
    if (run) {
      ordered.push(run)
      byId.delete(id)
    }
  }
  for (const run of byId.values()) ordered.push(run)
  return ordered
}

export function GeoQueriesPanel({
  overview,
  initialQuery,
  initialModel,
}: {
  overview: GeoOverview
  initialQuery?: string
  initialModel?: string
}) {
  const clusters = useMemo(() => groupRunsByQuery(overview), [overview])
  const initial =
    initialQuery && clusters.some((c) => c.query === initialQuery)
      ? initialQuery
      : (clusters[0]?.query ?? null)
  const [activeQuery, setActiveQuery] = useState<string | null>(initial)
  const [activeModelId, setActiveModelId] = useState<string | null>(initialModel ?? null)

  const active = clusters.find((c) => c.query === activeQuery) ?? clusters[0] ?? null
  const orderedRuns = useMemo(
    () => (active ? orderRuns(active.runs, overview.models) : []),
    [active, overview.models],
  )

  useEffect(() => {
    if (!active || orderedRuns.length === 0) {
      setActiveModelId(null)
      return
    }
    setActiveModelId((prev) => {
      if (prev && orderedRuns.some((r) => r.modelId === prev)) return prev
      if (
        initialModel &&
        active.query === initialQuery &&
        orderedRuns.some((r) => r.modelId === initialModel)
      ) {
        return initialModel
      }
      return orderedRuns[0]!.modelId
    })
  }, [active, orderedRuns, initialModel, initialQuery])

  // Keep ?q=&model= shareable without a navigation when switching strip / prompt.
  useEffect(() => {
    if (typeof window === 'undefined' || !active?.query || !activeModelId) return
    const url = new URL(window.location.href)
    if (
      url.searchParams.get('q') === active.query &&
      url.searchParams.get('model') === activeModelId
    ) {
      return
    }
    url.searchParams.set('q', active.query)
    url.searchParams.set('model', activeModelId)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)
  }, [active?.query, activeModelId])

  const activeRun =
    orderedRuns.find((r) => r.modelId === activeModelId) ?? orderedRuns[0] ?? null
  const activeCell = activeRun
    ? findCellAnalysis(overview.insights, activeRun.queryId, activeRun.modelId)
    : undefined

  const duel = active
    ? overview.insights.promptDuels.find((d) => d.query === active.query)
    : undefined
  const intent = active ? findIntent(overview.insights, active.query) : undefined
  const disagree = active ? findDisagreement(overview.insights, active.query) : undefined
  const citedInActive = active
    ? active.runs.filter((r) => r.ourPosition != null).length
    : 0

  return (
    <div className="checkion-magazine-body checkion-spread checkion-geo-spread-layout">
      <section className="checkion-geo-dossier" aria-label="Prompt dossier">
        <nav className="checkion-geo-dossier__index" aria-label="Prompts">
          <p className="checkion-spread__eyebrow">Prompts</p>
          <ol className="checkion-geo-dossier__nav">
            {clusters.map((cluster, i) => {
              const d = overview.insights.promptDuels.find((x) => x.query === cluster.query)
              const selected = cluster.query === (active?.query ?? null)
              return (
                <li key={cluster.query}>
                  <button
                    type="button"
                    className="checkion-geo-dossier__nav-btn"
                    data-active={selected ? 'true' : undefined}
                    data-tone={d ? outcomeTone(d.outcome) : undefined}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => setActiveQuery(cluster.query)}
                  >
                    <span className="checkion-geo-dossier__nav-idx" aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="checkion-geo-dossier__nav-q">{cluster.query}</span>
                    {d ? (
                      <span className="checkion-geo-dossier__nav-out">{d.outcome}</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        {active ? (
          <div className="checkion-geo-dossier__detail" key={active.query}>
            <header className="checkion-geo-dossier__head">
              <div className="checkion-geo-dossier__meta">
                {intent ? (
                  <span className="checkion-geo-dossier__intent">{intent.intent}</span>
                ) : null}
                {duel ? (
                  <span
                    className="checkion-geo-dossier__outcome"
                    data-tone={outcomeTone(duel.outcome)}
                  >
                    {duel.outcome}
                  </span>
                ) : null}
                <span className="checkion-geo-dossier__cite">
                  {citedInActive}/{active.runs.length} cite you
                </span>
                {disagree ? (
                  <span className="checkion-geo-dossier__split">
                    {disagree.kind === 'cite_split' ? 'models disagree' : 'first cite varies'}
                  </span>
                ) : null}
              </div>
              <h3 className="checkion-geo-dossier__prompt">{active.query}</h3>
            </header>

            <div className="checkion-geo-dossier__reading">
              <GeoReading
                jobId={overview.job.id}
                kind="query"
                query={active.query}
                fallback={buildPromptReadingFallback(overview, active.query)}
              />
            </div>

            <ModelPlacementStrip
              runs={orderedRuns}
              insights={overview.insights}
              activeModelId={activeRun?.modelId ?? ''}
              preferredModel={
                active.query === initialQuery ? initialModel : undefined
              }
              onSelect={setActiveModelId}
            />

            <div className="checkion-geo-dossier__answers">
              <p className="checkion-spread__eyebrow">Answer</p>
              {activeRun ? (
                <AnswerDetail
                  key={`${active.query}-${activeRun.modelId}`}
                  run={activeRun}
                  cell={activeCell}
                  targetHost={overview.targetHost}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
