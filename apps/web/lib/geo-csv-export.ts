import type { GeoOverview, GeoQueryRun } from '@checkion-v3/contracts'

/** Stable CSV header order — see `specs/api/geo-job-export-csv.md`. */
export const GEO_CSV_COLUMNS = [
  'job_id',
  'job_title',
  'project_id',
  'url',
  'target_host',
  'status',
  'measurement',
  'search_market',
  'completed_at',
  'overall_score',
  'cited_share',
  'query_count',
  'model_count',
  'competitors',
  'models',
  'lede',
  'solo_cited_share',
  'solo_miss_rate',
  'solo_avg_position',
  'solo_first_cite_rate',
  'solo_mentioned_share',
  'field_leader_domain',
  'field_gap_to_lead',
  'rival_source',
  'rivals',
  'eeat_experience',
  'eeat_expertise',
  'eeat_authoritativeness',
  'eeat_trustworthiness',
  'eeat_geo_fitness',
  'eeat_missing_elements',
  'query_id',
  'query',
  'model_id',
  'answer_text',
  'our_position',
  'citations',
  'citation_urls',
  'citation_contexts',
  'search_queries',
  'first_domain',
  'rival_domains_in_answer',
  'co_cited',
  'stolen_by',
  'target_mentioned_in_answer',
  'prompt_intent',
  'prompt_duel_outcome',
  'prompt_target_hit_rate',
] as const

export type GeoCsvColumn = (typeof GEO_CSV_COLUMNS)[number]

const LIST_SEP = '; '

/** Neutralize spreadsheet formula injection (Excel / Sheets). */
export function sanitizeCsvCell(raw: string): string {
  if (/^[=+\-@]/.test(raw)) return `'${raw}`
  return raw
}

/** RFC 4180 field escape. */
export function escapeCsvField(value: unknown): string {
  const str = sanitizeCsvCell(value == null ? '' : String(value))
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function joinCsvList(values: Array<string | number | null | undefined>): string {
  return values
    .filter((v): v is string | number => v != null && String(v).length > 0)
    .map(String)
    .join(LIST_SEP)
}

export function geoCsvFilename(jobId: string): string {
  const safe =
    jobId
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'job'
  return `checkion-geo-${safe}.csv`
}

function cellInsight(overview: GeoOverview, run: GeoQueryRun) {
  return overview.insights.cells.find(
    (c) => c.queryId === run.queryId && c.modelId === run.modelId && c.query === run.query,
  )
}

function promptIntent(overview: GeoOverview, query: string) {
  return overview.insights.intents.find((i) => i.query === query)?.intent ?? ''
}

function promptDuel(overview: GeoOverview, query: string) {
  return overview.insights.promptDuels.find((d) => d.query === query)
}

function jobColumns(overview: GeoOverview): Record<string, string | number> {
  const { job, presence, eeat } = overview
  return {
    job_id: job.id,
    job_title: job.title,
    project_id: job.projectId,
    url: job.url,
    target_host: overview.targetHost,
    status: job.status,
    measurement: job.measurement ?? 'recall',
    search_market: overview.searchMarket ?? job.searchMarket ?? '',
    completed_at: job.completedAt ?? '',
    overall_score: job.overallScore ?? '',
    cited_share: job.citedShare ?? '',
    query_count: job.queryCount,
    model_count: job.modelCount,
    competitors: joinCsvList(overview.competitors),
    models: joinCsvList(overview.models),
    lede: overview.lede,
    solo_cited_share: presence.solo.citedShare,
    solo_miss_rate: presence.solo.missRate,
    solo_avg_position: presence.solo.avgPosition ?? '',
    solo_first_cite_rate: presence.solo.firstCiteRate ?? '',
    solo_mentioned_share: presence.solo.mentionedShare ?? '',
    field_leader_domain: presence.field?.leaderDomain ?? '',
    field_gap_to_lead: presence.field?.gapToLead ?? '',
    rival_source: presence.rivalSource,
    rivals: joinCsvList(presence.rivals),
    eeat_experience: eeat?.experience ?? '',
    eeat_expertise: eeat?.expertise ?? '',
    eeat_authoritativeness: eeat?.authoritativeness ?? '',
    eeat_trustworthiness: eeat?.trustworthiness ?? '',
    eeat_geo_fitness: eeat?.geoFitness ?? '',
    eeat_missing_elements: joinCsvList(eeat?.missingElements ?? []),
  }
}

function runColumns(overview: GeoOverview, run: GeoQueryRun): Record<string, string | number> {
  const insight = cellInsight(overview, run)
  const duel = promptDuel(overview, run.query)
  return {
    query_id: run.queryId,
    query: run.query,
    model_id: run.modelId,
    answer_text: run.answerText,
    our_position: run.ourPosition ?? '',
    citations: joinCsvList(run.citations.map((c) => `${c.domain}@${c.position}`)),
    citation_urls: joinCsvList(run.citations.map((c) => c.url).filter(Boolean)),
    citation_contexts: joinCsvList(run.citations.map((c) => c.context).filter(Boolean)),
    search_queries: joinCsvList(run.searchQueries ?? []),
    first_domain: insight?.firstDomain ?? '',
    rival_domains_in_answer: joinCsvList(insight?.rivalDomains ?? []),
    co_cited: insight ? (insight.coCited ? 'true' : 'false') : '',
    stolen_by: insight?.stolenBy ?? '',
    target_mentioned_in_answer: insight
      ? insight.targetMentionedInAnswer
        ? 'true'
        : 'false'
      : '',
    prompt_intent: promptIntent(overview, run.query),
    prompt_duel_outcome: duel?.outcome ?? '',
    prompt_target_hit_rate: duel?.targetHitRate ?? '',
  }
}

export function buildGeoCsvRows(overview: GeoOverview): Array<Record<GeoCsvColumn, string | number>> {
  const base = jobColumns(overview)
  return overview.queryRuns.map((run) => {
    const row = { ...base, ...runColumns(overview, run) } as Record<GeoCsvColumn, string | number>
    return row
  })
}

/** Full CSV document including UTF-8 BOM and CRLF line endings. */
export function buildGeoCsv(overview: GeoOverview): string {
  const header = GEO_CSV_COLUMNS.join(',')
  const rows = buildGeoCsvRows(overview).map((row) =>
    GEO_CSV_COLUMNS.map((col) => escapeCsvField(row[col])).join(','),
  )
  const body = [header, ...rows].join('\r\n')
  return `\uFEFF${body}${rows.length || header ? '\r\n' : ''}`
}
