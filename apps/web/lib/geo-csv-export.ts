import type { GeoOverview, GeoQueryRun } from '@checkion-v3/contracts'

/**
 * Spreadsheet-first GEO export — German Excel friendly.
 * See `specs/api/geo-job-export-csv.md`.
 *
 * - `;` field separator (Excel DE)
 * - One physical row per query×model (newlines flattened)
 * - Analysis columns first; thin job context last
 */
export const GEO_CSV_COLUMNS = [
  'query_index',
  'query',
  'model_id',
  'hit',
  'our_position',
  'first_domain',
  'stolen_by',
  'co_cited',
  'target_mentioned',
  'prompt_intent',
  'prompt_duel_outcome',
  'prompt_hit_rate',
  'citations',
  'citation_urls',
  'search_queries',
  'answer_text',
  'job_id',
  'job_title',
  'target_host',
  'url',
  'measurement',
  'search_market',
  'completed_at',
  'status',
  'cited_share',
  'overall_score',
  'rivals',
  'eeat_experience',
  'eeat_expertise',
  'eeat_authoritativeness',
  'eeat_trustworthiness',
  'eeat_geo_fitness',
] as const

export type GeoCsvColumn = (typeof GEO_CSV_COLUMNS)[number]

/** Field separator — `;` so Excel DE does not dump the sheet into one column. */
export const GEO_CSV_DELIMITER = ';'

/** Inside list cells — must not collide with the field delimiter. */
const LIST_SEP = ' | '

/** Neutralize spreadsheet formula injection (Excel / Sheets). */
export function sanitizeCsvCell(raw: string): string {
  if (/^[=+\-@]/.test(raw)) return `'${raw}`
  return raw
}

/** Collapse whitespace so each query×model stays one spreadsheet row. */
export function flattenCsvText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
}

/** Escape one field for `;`-separated CSV. */
export function escapeCsvField(value: unknown): string {
  const str = sanitizeCsvCell(flattenCsvText(value))
  if (/[;"\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function joinCsvList(values: Array<string | number | null | undefined>): string {
  return values
    .filter((v): v is string | number => v != null && String(v).length > 0)
    .map((v) => flattenCsvText(v))
    .filter(Boolean)
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

function queryIndex(overview: GeoOverview, query: string): number {
  const idx = overview.queries.indexOf(query)
  return idx >= 0 ? idx + 1 : 0
}

function jobContext(overview: GeoOverview): Record<string, string | number> {
  const { job, presence, eeat } = overview
  return {
    job_id: job.id,
    job_title: job.title,
    target_host: overview.targetHost,
    url: job.url,
    measurement: job.measurement ?? 'recall',
    search_market: overview.searchMarket ?? job.searchMarket ?? '',
    completed_at: job.completedAt ?? '',
    status: job.status,
    cited_share: job.citedShare ?? '',
    overall_score: job.overallScore ?? '',
    rivals: joinCsvList(presence.rivals),
    eeat_experience: eeat?.experience ?? '',
    eeat_expertise: eeat?.expertise ?? '',
    eeat_authoritativeness: eeat?.authoritativeness ?? '',
    eeat_trustworthiness: eeat?.trustworthiness ?? '',
    eeat_geo_fitness: eeat?.geoFitness ?? '',
  }
}

function runColumns(overview: GeoOverview, run: GeoQueryRun): Record<string, string | number> {
  const insight = cellInsight(overview, run)
  const duel = promptDuel(overview, run.query)
  const hit = run.ourPosition != null
  return {
    query_index: queryIndex(overview, run.query),
    query: run.query,
    model_id: run.modelId,
    hit: hit ? 'yes' : 'no',
    our_position: run.ourPosition ?? '',
    first_domain: insight?.firstDomain ?? '',
    stolen_by: insight?.stolenBy ?? '',
    co_cited: insight ? (insight.coCited ? 'yes' : 'no') : '',
    target_mentioned: insight ? (insight.targetMentionedInAnswer ? 'yes' : 'no') : '',
    prompt_intent: promptIntent(overview, run.query),
    prompt_duel_outcome: duel?.outcome ?? '',
    prompt_hit_rate: duel?.targetHitRate ?? '',
    citations: joinCsvList(run.citations.map((c) => `${c.domain}@${c.position}`)),
    citation_urls: joinCsvList(run.citations.map((c) => c.url).filter(Boolean)),
    search_queries: joinCsvList(run.searchQueries ?? []),
    answer_text: run.answerText,
  }
}

export function buildGeoCsvRows(overview: GeoOverview): Array<Record<GeoCsvColumn, string | number>> {
  const base = jobContext(overview)
  const sorted = [...overview.queryRuns].sort((a, b) => {
    const qi = queryIndex(overview, a.query) - queryIndex(overview, b.query)
    if (qi !== 0) return qi
    return a.modelId.localeCompare(b.modelId)
  })
  return sorted.map((run) => {
    const row = { ...base, ...runColumns(overview, run) } as Record<GeoCsvColumn, string | number>
    return row
  })
}

/**
 * Full CSV document:
 * - UTF-8 BOM
 * - `sep=;` Excel hint line
 * - CRLF rows
 * - `;` delimiter
 */
export function buildGeoCsv(overview: GeoOverview): string {
  const header = GEO_CSV_COLUMNS.join(GEO_CSV_DELIMITER)
  const rows = buildGeoCsvRows(overview).map((row) =>
    GEO_CSV_COLUMNS.map((col) => escapeCsvField(row[col])).join(GEO_CSV_DELIMITER),
  )
  const body = ['sep=;', header, ...rows].join('\r\n')
  return `\uFEFF${body}\r\n`
}
