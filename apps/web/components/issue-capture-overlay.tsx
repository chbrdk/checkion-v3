'use client'

import type {
  IssueSeverity,
  IssueSummary,
  VisualLayersSnapshot,
} from '@checkion-v3/contracts'

/** Capture coordinate space for live scan-single-1 full-page JPEG (1920×5053). */
export const ISSUE_CAPTURE_VIEWPORT = { width: 1920, height: 5053 } as const

export type CaptureLayer = 'issues' | 'heatmap' | 'regions'

function severityTone(severity: IssueSeverity): string {
  if (severity === 'critical' || severity === 'serious') return 'neg'
  if (severity === 'moderate') return 'low'
  return 'ok'
}

function availableLayers(visual?: VisualLayersSnapshot | null): CaptureLayer[] {
  const layers: CaptureLayer[] = ['issues']
  if (visual?.saliencyHeatmapUrl) layers.push('heatmap')
  if (visual?.regions?.length) layers.push('regions')
  return layers
}

export function IssueCaptureOverlay({
  screenshotUrl,
  issues,
  visualLayers,
  activeId,
  onSelect,
  layer,
  onLayerChange,
}: {
  screenshotUrl: string
  issues: IssueSummary[]
  visualLayers?: VisualLayersSnapshot | null
  activeId: string | null
  onSelect: (id: string) => void
  layer: CaptureLayer
  onLayerChange: (layer: CaptureLayer) => void
}) {
  const marked = issues.filter((i) => i.boundingBox)
  const { width: vw, height: vh } = ISSUE_CAPTURE_VIEWPORT
  const layers = availableLayers(visualLayers)
  const regions = visualLayers?.regions ?? []
  const scanpath = visualLayers?.scanpath ?? []
  const heatmapUrl = visualLayers?.saliencyHeatmapUrl

  const showIssues = layer === 'issues'
  const showHeatmap = layer === 'heatmap' && Boolean(heatmapUrl)
  const showRegions = layer === 'regions'
  const showScanpath = showHeatmap && scanpath.length > 1

  const caption =
    layer === 'heatmap'
      ? 'Saliency heatmap · fixture overlay'
      : layer === 'regions'
        ? `${regions.length} page regions`
        : `${marked.length} marked · click a box to inspect`

  return (
    <figure className="checkion-issue-capture" aria-label="Issue capture">
      {layers.length > 1 ? (
        <div className="checkion-issue-capture__layers" role="tablist" aria-label="Capture layers">
          {layers.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={layer === id}
              className={
                layer === id
                  ? 'checkion-issue-capture__layer-btn checkion-issue-capture__layer-btn--active'
                  : 'checkion-issue-capture__layer-btn'
              }
              onClick={() => onLayerChange(id)}
            >
              {id === 'issues' ? 'Issues' : id === 'heatmap' ? 'Heatmap' : 'Regions'}
            </button>
          ))}
        </div>
      ) : null}

      <div className="checkion-issue-capture__frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          alt="Page capture"
          className="checkion-issue-capture__img"
          width={vw}
          height={vh}
        />

        {showHeatmap && heatmapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heatmapUrl}
            alt=""
            className="checkion-issue-capture__heatmap"
            width={vw}
            height={vh}
            aria-hidden
          />
        ) : null}

        {showScanpath ? (
          <svg
            className="checkion-issue-capture__scanpath"
            viewBox={`0 0 ${vw} ${vh}`}
            aria-hidden
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={scanpath.map((p) => `${p.x},${p.y}`).join(' ')}
            />
            {scanpath.map((p, i) => (
              <circle key={`${p.x}-${p.y}-${i}`} cx={p.x} cy={p.y} r={i === 0 ? 7 : 4} />
            ))}
          </svg>
        ) : null}

        {showRegions ? (
          <div className="checkion-issue-capture__layer" aria-label="Page regions">
            {regions.map((region) => (
              <div
                key={region.id}
                className="checkion-page-region"
                style={{
                  left: `${(region.x / vw) * 100}%`,
                  top: `${(region.y / vh) * 100}%`,
                  width: `${(region.width / vw) * 100}%`,
                  height: `${(region.height / vh) * 100}%`,
                  ['--prominence' as string]: String(region.saliencyProminence ?? 0.5),
                }}
              >
                <span className="checkion-page-region__label">
                  {region.label}
                  {region.saliencyProminence != null
                    ? ` · ${Math.round(region.saliencyProminence * 100)}%`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {showIssues ? (
          <div className="checkion-issue-capture__layer" aria-hidden={marked.length === 0}>
            {marked.map((issue, index) => {
              const box = issue.boundingBox!
              const active = issue.id === activeId
              return (
                <button
                  key={issue.id}
                  type="button"
                  className="checkion-issue-marker"
                  data-tone={severityTone(issue.severity)}
                  data-active={active ? 'true' : undefined}
                  style={{
                    left: `${(box.x / vw) * 100}%`,
                    top: `${(box.y / vh) * 100}%`,
                    width: `${(box.width / vw) * 100}%`,
                    height: `${(box.height / vh) * 100}%`,
                  }}
                  aria-label={`Issue ${index + 1}: ${issue.title}`}
                  aria-pressed={active}
                  onClick={() => onSelect(issue.id)}
                >
                  <span className="checkion-issue-marker__idx">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
      <figcaption className="checkion-issue-capture__cap">{caption}</figcaption>
    </figure>
  )
}
