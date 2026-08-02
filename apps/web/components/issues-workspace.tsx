'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { IssueSummary, VisualLayersSnapshot } from '@checkion-v3/contracts'
import {
  IssueCaptureOverlay,
  type CaptureLayer,
} from './issue-capture-overlay'
import { IssueRail } from './issue-rail'

/** Chapter 02: full-width capture stage + compact findings rail (≈80/20). */
export function IssuesWorkspace({
  issues,
  screenshotUrl,
  visualLayers,
}: {
  issues: IssueSummary[]
  screenshotUrl?: string | null
  visualLayers?: VisualLayersSnapshot | null
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [layer, setLayer] = useState<CaptureLayer>('issues')
  const stageRef = useRef<HTMLDivElement>(null)

  const captureIssues = useMemo(() => {
    return issues.filter((i) => i.boundingBox)
  }, [issues])

  const selectIssue = (id: string | null) => {
    if (id) setLayer('issues')
    setOpenId(id)
  }

  useEffect(() => {
    if (!openId || layer !== 'issues') return
    const marker = stageRef.current?.querySelector(
      `.checkion-issue-marker[aria-pressed="true"]`,
    ) as HTMLElement | null
    if (marker && typeof marker.scrollIntoView === 'function') {
      try {
        marker.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' })
      } catch {
        /* jsdom */
      }
    }
  }, [openId, layer])

  if (!screenshotUrl) {
    return (
      <div className="checkion-issues-workspace checkion-issues-workspace--rail-only">
        <IssueRail issues={issues} openId={openId} onOpenChange={selectIssue} />
      </div>
    )
  }

  return (
    <div className="checkion-issues-workspace checkion-issues-workspace--stage" ref={stageRef}>
      <div className="checkion-issues-workspace__capture">
        <IssueCaptureOverlay
          screenshotUrl={screenshotUrl}
          issues={captureIssues}
          visualLayers={visualLayers}
          activeId={openId}
          onSelect={(id) => selectIssue(id)}
          layer={layer}
          onLayerChange={setLayer}
        />
      </div>
      <div className="checkion-issues-workspace__rail">
        <IssueRail issues={issues} openId={openId} onOpenChange={selectIssue} />
      </div>
    </div>
  )
}
