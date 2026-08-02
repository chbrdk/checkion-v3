/**
 * Live GEO job pipeline — stage1 scan → EEAT LLM → queryRuns → GeoOverview finalize.
 */

import type { GeoOverview } from '@checkion-v3/contracts'
import { OPENAI_MODEL } from '../llm/config'
import { emptyUsageTotals, mergeUsageTotals } from '../llm/usage-totals'
import type { ScanOptions, ScanResult } from '../scan/types'
import { buildGeoEeatResultFromScan } from './stage1'
import { runLlmStages } from './run-llm-stages'
import { runQueryRuns } from './run-query-runs'
import { buildLiveGeoOverview, buildQueuedGeoOverview } from './finalize-overview'
import { requireOpenAiKeyForLiveGeo } from './live-geo-gate'

export type CreateGeoJobInput = {
  projectId: string
  url: string
  queries: string[]
  models?: string[]
  competitors?: string[]
  title?: string
  /** Skip page scan (tests) or attach EEAT from scan. Default true for live. */
  includePageScan?: boolean
  waitForCompletion?: boolean
}

export type SingleScanRunner = (
  options: ScanOptions & { groupId?: string; userId?: string },
) => Promise<ScanResult>

let singleRunner: SingleScanRunner | null = null

/** Test hook — inject stub scanner (no Chromium). */
export function setGeoPageScanRunnerForTests(runner: SingleScanRunner | null): void {
  singleRunner = runner
}

async function defaultSingleRunner(
  options: ScanOptions & { groupId?: string; userId?: string },
): Promise<ScanResult> {
  const { runScan } = await import('../scan/scanner')
  return runScan(options)
}

export type GeoJobPersister = {
  insertQueued: (overview: GeoOverview) => Promise<void>
  updateOverview: (overview: GeoOverview) => Promise<void>
}

export async function executeLiveGeoPipeline(input: {
  jobId: string
  projectId: string
  url: string
  queries: string[]
  models: string[]
  competitors: string[]
  title?: string
  includePageScan?: boolean
  onStatus?: (status: 'running' | 'completed', overview: GeoOverview) => Promise<void>
}): Promise<GeoOverview> {
  requireOpenAiKeyForLiveGeo()

  const models = input.models.length > 0 ? input.models : [OPENAI_MODEL]
  const competitors = input.competitors ?? []
  const includePageScan = input.includePageScan !== false

  let running = buildQueuedGeoOverview({
    jobId: input.jobId,
    projectId: input.projectId,
    title: input.title,
    url: input.url,
    queries: input.queries,
    models,
    competitors,
  })
  running = {
    ...running,
    job: { ...running.job, status: 'running' },
    lede: `Running live GEO for ${running.targetHost}…`,
  }
  await input.onStatus?.('running', running)

  const usage = emptyUsageTotals()
  let eeatPayload = null as Awaited<ReturnType<typeof runLlmStages>>['payload'] | null

  if (includePageScan) {
    try {
      const runner = singleRunner ?? defaultSingleRunner
      const scan = await runner({
        url: input.url,
        standard: 'WCAG2AA',
        runners: ['axe', 'htmlcs'],
        device: 'desktop',
      })
      const stage1 = buildGeoEeatResultFromScan(scan)
      try {
        const llmOut = await runLlmStages(stage1)
        eeatPayload = llmOut.payload
        mergeUsageTotals(usage, llmOut.usage)
      } catch (e) {
        console.error('[checkion-v3] GEO LLM stages error:', e)
        eeatPayload = stage1
      }
    } catch (e) {
      console.error('[checkion-v3] GEO stage1 page scan error:', e)
    }
  }

  const queryOut = await runQueryRuns({
    targetUrl: input.url,
    competitors,
    queries: input.queries,
    models,
  })
  mergeUsageTotals(usage, queryOut.usage)

  if (input.queries.length > 0 && queryOut.queryRuns.length === 0) {
    throw new Error(
      'GEO query runs returned no results — check OPENAI_API_KEY and model access',
    )
  }

  const overview = buildLiveGeoOverview({
    jobId: input.jobId,
    projectId: input.projectId,
    title: input.title,
    url: input.url,
    queries: input.queries,
    models,
    competitors,
    queryRuns: queryOut.queryRuns,
    eeatPayload,
  })

  await input.onStatus?.('completed', overview)
  return overview
}

export function newGeoJobId(): string {
  return `geo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
