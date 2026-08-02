'use client'

import Link from 'next/link'
import { Text } from '@msqdx/ui'
import type {
  GeoInsights,
  GeoModelDisagreement,
  GeoOverview,
  GeoPromptDuelOutcome,
  GeoPromptIntent,
} from '@checkion-v3/contracts'
import { paths } from '../lib/paths'

function outcomeLabel(outcome: GeoPromptDuelOutcome): string {
  switch (outcome) {
    case 'win':
      return 'win'
    case 'tie':
      return 'tie'
    case 'lose':
      return 'lose'
    case 'miss':
      return 'miss'
    case 'solo':
      return 'solo'
  }
}

function outcomeTone(outcome: GeoPromptDuelOutcome): 'pos' | 'low' | 'neg' | undefined {
  if (outcome === 'win') return 'pos'
  if (outcome === 'tie' || outcome === 'solo') return 'low'
  return 'neg'
}

function intentLabel(intent: GeoPromptIntent): string {
  return intent
}

function disagreementLabel(d: GeoModelDisagreement): string {
  if (d.kind === 'cite_split') {
    const hit = d.hitModels?.length ?? 0
    const miss = d.missModels?.length ?? 0
    return `cite split ${hit}/${hit + miss}`
  }
  const domains = d.firstDomains ?? []
  return `first cite varies (${domains.length})`
}

export function GeoInsightsPanel({ overview }: { overview: GeoOverview }) {
  const { insights, job } = overview
  const hasMiss = insights.missVsRival.length > 0
  const co = insights.coCitation
  const citeSplits = insights.disagreements.filter((d) => d.kind === 'cite_split')
  const hasPulse = Boolean(co) || citeSplits.length > 0

  return (
    <section className="checkion-geo-insights" aria-labelledby="geo-insights-heading">
      <header className="checkion-metrics-spread__head">
        <p className="checkion-spread__eyebrow">Opportunities</p>
        <h3 id="geo-insights-heading" className="checkion-spread__headline">
          Where rivals take the cite
        </h3>
        <p className="checkion-geo-voice__lede">
          {hasMiss
            ? 'Cells where a rival is named and you are not — open the prompt to read the answer.'
            : 'No rival steals on this run. Prompt scoreboard still shows how each query lands.'}
        </p>
      </header>

      <div className="checkion-geo-insights__split">
        <div className="checkion-geo-insights__col checkion-geo-insights__col--ops">
          {hasMiss ? (
            <ol className="checkion-geo-insights__ops" aria-label="Miss versus rival">
              {insights.missVsRival.map((row) => {
                const intent = insights.intents.find((t) => t.query === row.query)?.intent
                return (
                  <li key={`${row.query}-${row.modelId}-${row.rivalDomain}`}>
                    <Link
                      href={paths.routes.geoQueriesPrompt(job.id, row.query, row.modelId)}
                      className="checkion-geo-insights__op"
                    >
                      <span
                        className="checkion-geo-insights__op-contrast"
                        aria-label="Rival versus you"
                      >
                        <span data-role="rival">
                          {row.rivalDomain}
                          <span className="checkion-geo-insights__op-pos">
                            #{row.rivalPosition}
                          </span>
                        </span>
                        <span className="checkion-geo-insights__op-vs" aria-hidden>
                          vs
                        </span>
                        <span data-role="you">you miss</span>
                      </span>
                      <span className="checkion-geo-insights__op-q">{row.query}</span>
                      <span className="checkion-geo-insights__op-meta">
                        <span>{row.modelId}</span>
                        {intent ? (
                          <>
                            <span className="checkion-geo-insights__dot" aria-hidden>
                              ·
                            </span>
                            <span>{intentLabel(intent)}</span>
                          </>
                        ) : null}
                        <span className="checkion-geo-insights__dot" aria-hidden>
                          ·
                        </span>
                        <span className="checkion-geo-insights__op-go">Read answer</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="checkion-geo-insights__empty">
              No steal cells — every rival miss is also a target miss, or the field is empty.
            </p>
          )}
        </div>

        <aside className="checkion-geo-insights__col checkion-geo-insights__col--side">
          {hasPulse ? (
            <div
              className="checkion-geo-insights__pulse"
              aria-label="Co-citation and disagreement"
            >
              {co ? (
                <div className="checkion-geo-insights__pulse-stats">
                  <span className="checkion-geo-insights__pulse-stat">
                    <strong>{co.coCitedRate}%</strong>
                    <span>co-cited</span>
                  </span>
                  <span className="checkion-geo-insights__pulse-rule" aria-hidden />
                  <span className="checkion-geo-insights__pulse-stat">
                    <strong>{co.aloneCiteRate}%</strong>
                    <span>alone cite</span>
                  </span>
                </div>
              ) : null}
              {citeSplits.length > 0 ? (
                <div className="checkion-geo-insights__pulse-splits">
                  <span className="checkion-geo-insights__pulse-k">Models disagree</span>
                  <ul>
                    {citeSplits.map((d) => (
                      <li key={`${d.query}-${d.kind}`}>
                        <Link href={paths.routes.geoQueriesPrompt(job.id, d.query)}>
                          {disagreementLabel(d)}
                          <span className="checkion-geo-insights__pulse-q">
                            {d.query.length > 48 ? `${d.query.slice(0, 48)}…` : d.query}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <PromptScoreboard insights={insights} jobId={job.id} />
        </aside>
      </div>
    </section>
  )
}

function PromptScoreboard({
  insights,
  jobId,
}: {
  insights: GeoInsights
  jobId: string
}) {
  return (
    <div className="checkion-geo-insights__board">
      <header className="checkion-geo-insights__board-head">
        <p className="checkion-spread__eyebrow">Prompt scoreboard</p>
      </header>
      <ul className="checkion-geo-insights__duels" aria-label="Head to head by prompt">
        {insights.promptDuels.map((duel) => (
          <li key={duel.query}>
            <Link
              href={paths.routes.geoQueriesPrompt(jobId, duel.query)}
              className="checkion-geo-insights__duel"
              data-tone={outcomeTone(duel.outcome)}
            >
              <span className="checkion-geo-insights__duel-out">{outcomeLabel(duel.outcome)}</span>
              <span className="checkion-geo-insights__duel-q">{duel.query}</span>
              <span className="checkion-geo-insights__duel-stat">
                <span className="checkion-geo-insights__duel-intent">{intentLabel(duel.intent)}</span>
                <span className="checkion-geo-insights__dot" aria-hidden>
                  ·
                </span>
                <span>
                  {duel.targetHitRate}% cited
                  {duel.leaderDomain ? ` · lead ${duel.leaderDomain}` : ''}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {insights.promptDuels.length === 0 ? (
        <Text role="meta" as="p">
          No prompt duels on this run.
        </Text>
      ) : null}
    </div>
  )
}
