import type { SeoDashboardViewModel } from '@checkion-v3/contracts'
import type { Translator } from '../i18n'
import { localizeSeoDashboard } from './seo-market-i18n'

/** Rich OpenSEO-shaped fixture for dashboard review / preview (no vendor calls). */
export function fixtureSeoDashboard(input?: {
  projectId?: string
  projectName?: string
  domain?: string
}): SeoDashboardViewModel {
  const projectId = input?.projectId ?? 'proj-fixture-seo'
  const projectName = input?.projectName ?? 'Acme Demo'
  const domain = input?.domain ?? 'acme.example'
  const day = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return {
    projectId,
    projectName,
    domain,
    setupSteps: [
      {
        id: 'domain',
        label: 'Website bestätigt',
        detail: `${domain} ist als Collection-Domain hinterlegt.`,
        status: 'done',
      },
      {
        id: 'quality',
        label: 'Quality-Crawl starten',
        detail: 'On-page Audit (Broken Links, Tags, Indexability) unter Domain-Scans.',
        status: 'todo',
      },
      {
        id: 'keywords',
        label: 'Keywords speichern',
        detail: 'Research-Ideen persistieren für Rank-Tracking und Competitors.',
        status: 'todo',
      },
      {
        id: 'rank',
        label: 'Rank-Tracking einrichten',
        detail: 'Config mit Keywords + optional daily/weekly Schedule.',
        status: 'todo',
      },
      {
        id: 'gsc',
        label: 'Search Console verbinden',
        detail: 'First-party Clicks & Queries — OAuth folgt; bis dahin Fixture/Stub.',
        status: 'todo',
      },
      {
        id: 'mcp',
        label: 'Assistant / MCP',
        detail: 'checkion_v3.seo_* Tools im Suite-Assistant nutzen.',
        status: 'skipped',
      },
    ],
    cards: [
      {
        key: 'gsc',
        title: 'Search performance',
        hasData: true,
        href: 'gsc',
        facets: [
          { kind: 'source', label: 'Source', value: 'Google Search Console' },
          { kind: 'scope', label: 'Range', value: 'Last 28 days' },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        stats: [
          { label: 'Clicks', value: '1.284', tone: 'pos', delta: '▲ 12%' },
          { label: 'Impressions', value: '48.2k', tone: 'pos', delta: '▲ 4%' },
          { label: 'CTR', value: '2,7%' },
          { label: 'Avg position', value: '14,3' },
        ],
      },
      {
        key: 'audit',
        title: 'Site audit',
        hasData: true,
        href: 'audit',
        facets: [
          { kind: 'source', label: 'Source', value: 'Quality crawl' },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        stats: [
          { label: 'Issues', value: '18', tone: 'neg' },
          { label: 'Critical', value: '3', tone: 'neg' },
          { label: 'Pages', value: '86' },
          { label: 'Score', value: '72' },
        ],
      },
      {
        key: 'backlinks',
        title: 'Backlink pulse',
        hasData: true,
        href: 'backlinks',
        facets: [
          { kind: 'source', label: 'Source', value: 'Backlinks' },
          { kind: 'time', label: 'Snapshot', value: day },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        stats: [
          { label: 'DR', value: '68', tone: 'pos', delta: '▲ 2' },
          { label: 'Backlinks', value: '2.840', tone: 'pos', delta: '▲ 18' },
          { label: 'Ref. domains', value: '412' },
          { label: 'Lost links', value: '▼ 5', tone: 'neg' },
        ],
      },
      {
        key: 'rank',
        title: 'Rank monitor',
        hasData: true,
        href: 'rank-tracking',
        facets: [
          { kind: 'source', label: 'Source', value: 'Rank configs' },
          { kind: 'time', label: 'Last check', value: 'Today' },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        stats: [
          { label: 'Tracked', value: '24' },
          { label: 'Top 10', value: '9', tone: 'pos' },
          { label: 'Improved', value: '▲ 6', tone: 'pos' },
          { label: 'Declined', value: '▼ 3', tone: 'neg' },
        ],
      },
      {
        key: 'domain',
        title: 'Domain overview',
        hasData: true,
        href: 'domain',
        facets: [
          { kind: 'source', label: 'Source', value: 'DataForSEO organic' },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        stats: [
          { label: 'Organic KW', value: '1.120' },
          { label: 'Traffic', value: '18.4k' },
          { label: 'Cost', value: '$4.2k' },
          { label: 'Saved KW', value: '16' },
        ],
      },
      {
        key: 'competitors',
        title: 'Competitive field',
        hasData: true,
        href: 'competitors',
        facets: [
          { kind: 'source', label: 'Job', value: 'SERP overlap' },
          { kind: 'scope', label: 'Set', value: '12 terms · DE' },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        stats: [
          { label: 'Rivals', value: '8' },
          { label: 'Avg overlap', value: '5,6' },
          { label: 'Best avg rank', value: '6,2', tone: 'neg' },
          { label: 'High threats', value: '3', tone: 'neg' },
        ],
      },
    ],
  }
}

/**
 * Empty overview for the live workspace — CTAs only until real Market data exists.
 */
export function emptySeoDashboard(input?: {
  projectId?: string
  projectName?: string
  domain?: string
  t?: Translator
}): SeoDashboardViewModel {
  const projectId = input?.projectId ?? 'proj-seo'
  const projectName = input?.projectName ?? 'Project'
  const domain = input?.domain ?? 'example.com'

  const model: SeoDashboardViewModel = {
    projectId,
    projectName,
    domain,
    setupSteps: [
      {
        id: 'domain',
        label: 'Website confirmed',
        detail: domain
          ? `${domain} is set as the Collection domain.`
          : 'Set a domain on the Collection project.',
        status: domain && domain !== 'example.com' ? 'done' : 'todo',
      },
      {
        id: 'keywords',
        label: 'Start research',
        detail: 'Seed → save ideas for Ranks and Field.',
        status: 'todo',
      },
      {
        id: 'rank',
        label: 'Set up rank monitor',
        detail: 'Tracked set + Track & check.',
        status: 'todo',
      },
      {
        id: 'gsc',
        label: 'Connect Search Console',
        detail: 'First-party clicks & queries — OAuth follows.',
        status: 'todo',
      },
    ],
    cards: [
      {
        key: 'gsc',
        title: 'Search performance',
        hasData: false,
        href: 'gsc',
        facets: [
          { kind: 'source', label: 'Source', value: 'Google Search Console' },
          { kind: 'mode', label: 'Mode', value: 'Empty' },
        ],
        emptyMessage: 'Connect GSC — first-party queries & clicks.',
        emptyCtaLabel: 'Open GSC',
      },
      {
        key: 'audit',
        title: 'Site audit',
        hasData: false,
        href: 'audit',
        facets: [
          { kind: 'source', label: 'Source', value: 'Quality crawl' },
          { kind: 'mode', label: 'Mode', value: 'Empty' },
        ],
        emptyMessage: 'Start a Quality crawl for on-page issues.',
        emptyCtaLabel: 'Start scan',
      },
      {
        key: 'backlinks',
        title: 'Backlink pulse',
        hasData: false,
        href: 'backlinks',
        facets: [
          { kind: 'source', label: 'Source', value: 'Backlinks' },
          { kind: 'mode', label: 'Mode', value: 'Empty' },
        ],
        emptyMessage: 'Refresh backlinks — referring domains & new/lost.',
        emptyCtaLabel: 'Open backlinks',
      },
      {
        key: 'rank',
        title: 'Rank monitor',
        hasData: false,
        href: 'rank-tracking',
        facets: [
          { kind: 'source', label: 'Source', value: 'Rank configs' },
          { kind: 'mode', label: 'Mode', value: 'Empty' },
        ],
        emptyMessage: 'Track keywords and check positions.',
        emptyCtaLabel: 'Open ranks',
      },
      {
        key: 'domain',
        title: 'Domain overview',
        hasData: false,
        href: 'domain',
        facets: [
          { kind: 'source', label: 'Source', value: 'DataForSEO organic' },
          { kind: 'mode', label: 'Mode', value: 'Empty' },
        ],
        emptyMessage: 'Refresh domain — organic keywords & traffic.',
        emptyCtaLabel: 'Open domain',
      },
      {
        key: 'competitors',
        title: 'Competitive field',
        hasData: false,
        href: 'competitors',
        facets: [
          { kind: 'source', label: 'Job', value: 'SERP overlap' },
          { kind: 'mode', label: 'Mode', value: 'Empty' },
        ],
        emptyMessage:
          'Analyze a keyword set — overlap from Research or a manual set.',
        emptyCtaLabel: 'Open field',
      },
    ],
  }
  return input?.t ? localizeSeoDashboard(model, input.t) : model
}
