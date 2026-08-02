import type { ReactNode } from 'react'

export type DistributionSlice = {
  id: string
  label: string
  value: number
}

function buildConic(slices: DistributionSlice[], total: number): string {
  let acc = 0
  const stops: string[] = []
  slices.forEach((slice, i) => {
    if (slice.value <= 0) return
    const start = (acc / total) * 100
    acc += slice.value
    const end = (acc / total) * 100
    stops.push(`var(--donut-${Math.min(i + 1, 8)}) ${start}% ${end}%`)
  })
  if (stops.length === 0) {
    return 'var(--line, #333) 0% 100%'
  }
  return stops.join(', ')
}

/** Soft multi-slice donut for corpus share — not a ranking chart. */
export function DistributionDonut({
  slices,
  centerValue,
  centerLabel,
  'aria-label': ariaLabel,
}: {
  slices: DistributionSlice[]
  centerValue?: ReactNode
  centerLabel?: ReactNode
  'aria-label'?: string
}) {
  const positive = slices.filter((s) => s.value > 0)
  const total = positive.reduce((sum, s) => sum + s.value, 0) || 1
  const gradient = buildConic(positive, total)

  return (
    <div className="checkion-donut" role="img" aria-label={ariaLabel}>
      <div
        className="checkion-donut__chart"
        style={{ background: `conic-gradient(from -90deg, ${gradient})` }}
        aria-hidden
      >
        <div className="checkion-donut__hole">
          {centerValue != null ? (
            <span className="checkion-donut__center-v">{centerValue}</span>
          ) : null}
          {centerLabel != null ? (
            <span className="checkion-donut__center-k">{centerLabel}</span>
          ) : null}
        </div>
      </div>
      <ul className="checkion-donut__legend">
        {positive.map((slice, i) => {
          const pct = Math.round((100 * slice.value) / total)
          return (
            <li key={slice.id} data-i={Math.min(i + 1, 8)}>
              <span className="checkion-donut__swatch" aria-hidden />
              <span className="checkion-donut__name">{slice.label}</span>
              <span className="checkion-donut__n">{slice.value.toLocaleString()}</span>
              <span className="checkion-donut__pct">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
