'use client'

import type { GeoOverview, GeoPresence, GeoShareOfVoice } from '@checkion-v3/contracts'

function hostLabel(domain: string, isTarget?: boolean): string {
  if (domain === 'other') return 'Other'
  return isTarget ? `${domain} · you` : domain
}

function FieldStage({
  field,
  targetHost,
}: {
  field: NonNullable<GeoPresence['field']>
  targetHost: string
}) {
  const ranked: Array<GeoShareOfVoice & { rank: number }> = [...field.shareOfVoice]
    .filter((r) => r.domain !== 'other' || r.shareOfVoice > 0)
    .sort((a, b) => b.shareOfVoice - a.shareOfVoice)
    .map((r, i) => ({ ...r, rank: i + 1 }))

  const target = ranked.find((r) => r.isTarget) ?? ranked.find((r) => r.domain === targetHost)
  const rival =
    ranked.find((r) => !r.isTarget && r.domain !== targetHost && r.domain !== 'other') ?? null
  const gap = field.gapToLead
  const maxShare = Math.max(...ranked.map((r) => r.shareOfVoice), 1)
  const ahead = gap != null && gap < 0
  const tied = gap === 0
  const tone = ahead || tied ? 'pos' : gap != null && gap <= 8 ? 'low' : 'neg'

  return (
    <section className="checkion-geo-voice" aria-labelledby="geo-presence-heading" data-tone={tone}>
      <header className="checkion-geo-voice__head">
        <p className="checkion-spread__eyebrow">The field</p>
        <h3 id="geo-presence-heading" className="checkion-spread__headline">
          Share of voice
        </h3>
        {target && rival ? (
          <p className="checkion-geo-voice__lede">
            {tied
              ? `${target.domain} and ${rival.domain} are tied at ${target.shareOfVoice}% of model mentions.`
              : ahead
                ? `${target.domain} leads the mention mix at ${target.shareOfVoice}% — ahead of ${rival.domain} by ${Math.abs(gap ?? 0)} points.`
                : `${rival.domain} leads at ${rival.shareOfVoice}% while ${target.domain} holds ${target.shareOfVoice}% — a ${gap}-point gap across query × model cells.`}
          </p>
        ) : null}
      </header>

      {target && rival ? (
        <div className="checkion-geo-voice__duel" aria-label="You versus nearest rival">
          <div className="checkion-geo-voice__duel-side" data-role="you">
            <span className="checkion-geo-voice__duel-k">You</span>
            <span className="checkion-geo-voice__duel-num">
              <span className="checkion-geo-voice__duel-v">{target.shareOfVoice}</span>
              <span className="checkion-geo-voice__duel-unit">%</span>
            </span>
            <span className="checkion-geo-voice__duel-host">{target.domain}</span>
          </div>
          <div className="checkion-geo-voice__duel-mid" data-tone={tone}>
            <span className="checkion-geo-voice__duel-gap">
              {tied ? '±0' : ahead ? `+${Math.abs(gap ?? 0)}` : `−${gap}`}
            </span>
            <span className="checkion-geo-voice__duel-gap-l">
              {tied ? 'tied' : ahead ? 'pts ahead' : 'pts behind'}
            </span>
          </div>
          <div className="checkion-geo-voice__duel-side" data-role="rival">
            <span className="checkion-geo-voice__duel-k">{ahead ? 'Rival' : 'Lead'}</span>
            <span className="checkion-geo-voice__duel-num">
              <span className="checkion-geo-voice__duel-v">{rival.shareOfVoice}</span>
              <span className="checkion-geo-voice__duel-unit">%</span>
            </span>
            <span className="checkion-geo-voice__duel-host">{rival.domain}</span>
          </div>
        </div>
      ) : null}

      <ol className="checkion-geo-voice__race" aria-label="Share of voice ranking">
        {ranked.map((row) => {
          const width = Math.max(4, Math.round((100 * row.shareOfVoice) / maxShare))
          return (
            <li
              key={row.domain}
              className="checkion-geo-voice__runner"
              data-target={row.isTarget ? 'true' : undefined}
              data-rank={row.rank}
              style={{ ['--voice-w' as string]: `${width}%` }}
            >
              <div className="checkion-geo-voice__runner-meta">
                <span className="checkion-geo-voice__runner-idx" aria-hidden>
                  {String(row.rank).padStart(2, '0')}
                </span>
                <span className="checkion-geo-voice__runner-name">
                  {hostLabel(row.domain, row.isTarget)}
                </span>
                <span className="checkion-geo-voice__runner-pct">{row.shareOfVoice}%</span>
              </div>
              <div className="checkion-geo-voice__track" aria-hidden>
                <span className="checkion-geo-voice__fill" />
              </div>
              <p className="checkion-geo-voice__runner-sub">
                {row.mentionCount} mentions · avg citation #{row.avgPosition.toFixed(1)}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function SoloStage({ presence }: { presence: GeoPresence }) {
  const { solo } = presence
  const tone =
    solo.citedShare >= 55 ? 'pos' : solo.citedShare >= 35 ? 'low' : 'neg'
  const maxQueryCells = Math.max(...solo.byQuery.map((q) => q.cellCount), 1)

  return (
    <section className="checkion-geo-voice checkion-geo-voice--solo" aria-labelledby="geo-presence-heading" data-tone={tone}>
      <header className="checkion-geo-voice__head">
        <p className="checkion-spread__eyebrow">Your presence</p>
        <h3 id="geo-presence-heading" className="checkion-spread__headline">
          Cited in answer engines
        </h3>
        <p className="checkion-geo-voice__lede">
          No rivals in this run — measuring only whether models cite you across {solo.cellCount}{' '}
          query × model cells. You appear in {solo.hitCount} of them ({solo.citedShare}% cited share
          · {solo.missRate}% miss).
        </p>
      </header>

      <div className="checkion-geo-voice__solo-hero" aria-label="Cited share">
        <span className="checkion-geo-voice__duel-k">Cited share</span>
        <span className="checkion-geo-voice__duel-num">
          <span className="checkion-geo-voice__duel-v">{solo.citedShare}</span>
          <span className="checkion-geo-voice__duel-unit">%</span>
        </span>
        <div className="checkion-geo-voice__solo-meta">
          <span>
            Avg position{' '}
            <strong>{solo.avgPosition != null ? `#${solo.avgPosition.toFixed(1)}` : '—'}</strong>
          </span>
          <span>
            First cite{' '}
            <strong>{solo.firstCiteRate != null ? `${solo.firstCiteRate}%` : '—'}</strong>
          </span>
        </div>
      </div>

      <div className="checkion-geo-voice__solo-grid">
        <div>
          <p className="checkion-spread__eyebrow">By prompt</p>
          <ol className="checkion-geo-voice__race" aria-label="Hit rate by query">
            {solo.byQuery.map((row, i) => {
              const width = Math.max(4, Math.round((100 * row.hitCount) / maxQueryCells))
              return (
                <li
                  key={row.query}
                  className="checkion-geo-voice__runner"
                  data-target={row.hitRate === 100 ? 'true' : undefined}
                  data-rank={i + 1}
                  style={{ ['--voice-w' as string]: `${width}%` }}
                >
                  <div className="checkion-geo-voice__runner-meta">
                    <span className="checkion-geo-voice__runner-idx" aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="checkion-geo-voice__runner-name">{row.query}</span>
                    <span className="checkion-geo-voice__runner-pct">{row.hitRate}%</span>
                  </div>
                  <div className="checkion-geo-voice__track" aria-hidden>
                    <span className="checkion-geo-voice__fill" />
                  </div>
                  <p className="checkion-geo-voice__runner-sub">
                    {row.hitCount}/{row.cellCount} models cite you
                  </p>
                </li>
              )
            })}
          </ol>
        </div>
        <div>
          <p className="checkion-spread__eyebrow">By model</p>
          <ul className="checkion-geo-voice__model-strip" aria-label="Hit rate by model">
            {solo.byModel.map((m) => (
              <li key={m.modelId} data-tone={m.hitRate >= 50 ? 'pos' : 'neg'}>
                <span className="checkion-geo-voice__model-id">{m.modelId}</span>
                <span className="checkion-geo-voice__model-rate">{m.hitRate}%</span>
                <span className="checkion-geo-voice__runner-sub">
                  {m.hitCount}/{m.cellCount} cells
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/** Competitive presence stage — solo when no rivals; field SoV when rivals ≥ 1. */
export function GeoPresenceStage({ overview }: { overview: GeoOverview }) {
  const { presence, targetHost } = overview
  if (presence.field && presence.rivals.length >= 1) {
    return <FieldStage field={presence.field} targetHost={targetHost} />
  }
  return <SoloStage presence={presence} />
}
