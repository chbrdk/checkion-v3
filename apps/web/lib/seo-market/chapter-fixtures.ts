import type {
  SeoChapterId,
  SeoChapterViewModel,
} from '@checkion-v3/contracts'

type ChapterInput = {
  projectId?: string
  projectName?: string
  domain?: string
}

function base(input?: ChapterInput) {
  return {
    projectId: input?.projectId ?? 'proj-fixture-seo',
    projectName: input?.projectName ?? 'Acme Demo',
    domain: input?.domain ?? 'acme.example',
  }
}

const DAY = () =>
  new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

/** OpenSEO-shaped magazine chapter fixtures (no vendor calls). */
export function fixtureSeoChapter(
  chapter: SeoChapterId,
  input?: ChapterInput,
): SeoChapterViewModel {
  const { projectId, projectName, domain } = base(input)
  const day = DAY()

  switch (chapter) {
    case 'gsc':
      return {
        chapter,
        title: 'Search performance',
        projectId,
        projectName,
        domain,
        lede: 'First-party Search Console queries for the last 28 days.',
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
        charts: [
          {
            kind: 'series',
            title: 'Clicks & impressions · 28 days',
            height: 200,
            series: [
              {
                id: 'clicks',
                label: 'Clicks',
                points: [
                  { label: 'W1', value: 240 },
                  { label: 'W2', value: 268 },
                  { label: 'W3', value: 310 },
                  { label: 'W4', value: 466 },
                ],
              },
              {
                id: 'impressions',
                label: 'Impressions (÷10)',
                points: [
                  { label: 'W1', value: 980 },
                  { label: 'W2', value: 1040 },
                  { label: 'W3', value: 1180 },
                  { label: 'W4', value: 1620 },
                ],
              },
            ],
          },
          {
            kind: 'plot',
            title: 'Top queries by clicks',
            variant: 'bar',
            height: 200,
            points: [
              { label: 'acme platform', value: 312 },
              { label: 'seo audit', value: 188 },
              { label: 'brand guides', value: 96 },
              { label: 'rank tracker', value: 54 },
            ],
          },
        ],
        columns: [
          { key: 'query', label: 'Query' },
          { key: 'clicks', label: 'Clicks', align: 'end' },
          { key: 'impressions', label: 'Impr.', align: 'end' },
          { key: 'ctr', label: 'CTR', align: 'end' },
          { key: 'position', label: 'Pos.', align: 'end' },
        ],
        rows: [
          {
            id: 'q1',
            cells: {
              query: 'acme platform',
              clicks: '312',
              impressions: '8.4k',
              ctr: '3,7%',
              position: '6,2',
            },
            tone: 'pos',
          },
          {
            id: 'q2',
            cells: {
              query: 'seo audit tool',
              clicks: '188',
              impressions: '12.1k',
              ctr: '1,6%',
              position: '18,4',
            },
          },
          {
            id: 'q3',
            cells: {
              query: 'brand guidelines software',
              clicks: '96',
              impressions: '3.2k',
              ctr: '3,0%',
              position: '11,1',
            },
          },
          {
            id: 'q4',
            cells: {
              query: 'competitor rank tracker',
              clicks: '54',
              impressions: '2.8k',
              ctr: '1,9%',
              position: '22,0',
            },
            tone: 'neg',
          },
        ],
      }

    case 'keywords':
      return {
        chapter,
        title: 'Keyword research',
        projectId,
        projectName,
        domain,
        facets: [
          { kind: 'source', label: 'Job', value: 'Discover ideas' },
          { kind: 'scope', label: 'Locale', value: 'Germany · DE' },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        searchBand: {
          seed: domain.split('.')[0] || 'acme',
          seedLabel: 'Seed',
          actionLabel: 'Research',
          locale: 'de',
          location: 'Germany',
          recent: ['acme platform', 'seo workspace', 'rank tracking'],
          locales: [
            { value: 'de', label: 'DE' },
            { value: 'en', label: 'EN' },
            { value: 'fr', label: 'FR' },
          ],
        },
        stats: [
          { label: 'Ideas', value: '8' },
          { label: 'Avg volume', value: '1.495' },
          { label: 'Avg CPC', value: '0,67' },
          { label: 'Avg Comp', value: '0,37' },
        ],
        filters: [
          { id: 'all', label: 'All', tag: null },
          { id: 'info', label: 'Info', tag: 'info' },
          { id: 'trans', label: 'Trans', tag: 'trans' },
        ],
        ledgerMeta: 'Ideas · 8',
        pageSize: 5,
        columns: [
          { key: 'keyword', label: 'Idea' },
          { key: 'volume', label: 'Volume', align: 'end' },
          { key: 'cpc', label: 'CPC', align: 'end' },
          { key: 'comp', label: 'Comp.', align: 'end' },
          { key: 'score', label: 'KD', align: 'end' },
          { key: 'intent', label: 'Intent' },
        ],
        rows: [
          {
            id: 'kw1',
            tags: ['info'],
            tone: 'pos',
            cells: {
              keyword: 'acme platform',
              volume: '4.400',
              cpc: '1,20',
              comp: '0,38',
              score: '18',
              intent: 'Info',
            },
          },
          {
            id: 'kw2',
            tags: ['trans'],
            cells: {
              keyword: 'seo workspace',
              volume: '1.900',
              cpc: '0,86',
              comp: '0,44',
              score: '12',
              intent: 'Trans',
            },
          },
          {
            id: 'kw3',
            tags: ['info'],
            cells: {
              keyword: 'rank tracking api',
              volume: '880',
              cpc: '0,55',
              comp: '0,52',
              score: '8',
              intent: 'Info',
            },
          },
          {
            id: 'kw4',
            tags: ['trans'],
            tone: 'pos',
            cells: {
              keyword: 'backlink pulse',
              volume: '320',
              cpc: '0,40',
              comp: '0,29',
              score: '10',
              intent: 'Trans',
            },
          },
          {
            id: 'kw5',
            tags: ['info'],
            cells: {
              keyword: 'collection seo',
              volume: '720',
              cpc: '0,33',
              comp: '0,21',
              score: '5',
              intent: 'Info',
            },
          },
          {
            id: 'kw6',
            tags: ['trans'],
            cells: {
              keyword: 'market seo toolkit',
              volume: '2.100',
              cpc: '0,91',
              comp: '0,61',
              score: '14',
              intent: 'Trans',
            },
          },
          {
            id: 'kw7',
            tags: ['info'],
            cells: {
              keyword: 'gsc performance queries',
              volume: '540',
              cpc: '—',
              comp: '0,18',
              score: '2',
              intent: 'Info',
            },
          },
          {
            id: 'kw8',
            tags: ['info'],
            cells: {
              keyword: 'domain organic keywords',
              volume: '1.100',
              cpc: '0,47',
              comp: '0,35',
              score: '9',
              intent: 'Info',
            },
          },
        ],
        aside: {
          charts: [
            {
              kind: 'series',
              title: 'Search demand · 12 mo',
              height: 168,
              series: [
                {
                  id: 'vol',
                  label: 'Volume',
                  points: [
                    { label: 'Sep', value: 12 },
                    { label: 'Oct', value: 14 },
                    { label: 'Nov', value: 11 },
                    { label: 'Dec', value: 9 },
                    { label: 'Jan', value: 13 },
                    { label: 'Feb', value: 15 },
                    { label: 'Mar', value: 18 },
                    { label: 'Apr', value: 16 },
                    { label: 'May', value: 14 },
                    { label: 'Jun', value: 17 },
                    { label: 'Jul', value: 19 },
                    { label: 'Aug', value: 16 },
                  ],
                },
              ],
            },
          ],
          ledger: {
            title: 'SERP snapshot',
            meta: 'Organic results for seed',
            columns: [
              { key: 'rank', label: '#', align: 'end' },
              { key: 'page', label: 'Page', dual: true },
            ],
            rows: [
              {
                id: 's1',
                cells: {
                  rank: '1',
                  page: {
                    primary: 'Acme platform — SEO workspace overview',
                    secondary: `${domain}/`,
                  },
                },
                tone: 'pos',
              },
              {
                id: 's2',
                cells: {
                  rank: '2',
                  page: {
                    primary: 'Best SEO platforms in 2026',
                    secondary: 'techpress.example/guides/seo-platforms',
                  },
                },
              },
              {
                id: 's3',
                cells: {
                  rank: '3',
                  page: {
                    primary: 'Rank tracking API docs',
                    secondary: 'docs.example/rank-api',
                  },
                },
              },
              {
                id: 's4',
                cells: {
                  rank: '4',
                  page: {
                    primary: 'Market SEO toolkit comparison',
                    secondary: 'roundup.example/seo-toolkit',
                  },
                },
              },
              {
                id: 's5',
                cells: {
                  rank: '5',
                  page: {
                    primary: 'Collection SEO playbook',
                    secondary: 'wiki.example/collection-seo',
                  },
                },
              },
              {
                id: 's6',
                cells: {
                  rank: '6',
                  page: {
                    primary: 'Backlink pulse patterns',
                    secondary: 'lab.example/backlink-pulse',
                  },
                },
              },
            ],
          },
        },
      }

    case 'domain':
      return {
        chapter,
        title: 'Domain overview',
        projectId,
        projectName,
        domain,
        facets: [
          { kind: 'source', label: 'Source', value: 'Domain overview' },
          { kind: 'scope', label: 'Locale', value: 'Germany · DE' },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        searchBand: {
          seed: domain,
          seedLabel: 'Domain',
          actionLabel: 'Refresh',
          locale: 'de',
          location: 'Germany',
          recent: [domain, 'competitor.example', 'rival.example'],
          locales: [
            { value: 'de', label: 'DE' },
            { value: 'en', label: 'EN' },
            { value: 'fr', label: 'FR' },
          ],
        },
        stats: [
          { label: 'Organic KW', value: '1.120', tone: 'pos', delta: '▲ 48' },
          { label: 'Traffic', value: '18.4k', tone: 'pos', delta: '▲ 6%' },
          { label: 'Cost', value: '$4.2k' },
          { label: 'Pages', value: '86' },
        ],
        filters: [
          { id: 'all', label: 'All', tag: null },
          { id: 'top10', label: 'Top 10', tag: 'top10' },
          { id: 'mid', label: '11–20', tag: 'mid' },
          { id: 'deep', label: '21+', tag: 'deep' },
        ],
        ledgerMeta: 'Top keywords · 12',
        pageSize: 5,
        columns: [
          { key: 'keyword', label: 'Keyword', dual: true },
          { key: 'volume', label: 'Volume', align: 'end' },
          { key: 'position', label: 'Pos.', align: 'end' },
          { key: 'traffic', label: 'Traffic', align: 'end' },
        ],
        rows: [
          {
            id: 'd1',
            tags: ['top10'],
            tone: 'pos',
            cells: {
              keyword: {
                primary: 'acme platform',
                secondary: `${domain}/`,
              },
              volume: '6.600',
              position: '3',
              traffic: '2.1k',
            },
          },
          {
            id: 'd2',
            tags: ['top10'],
            tone: 'pos',
            cells: {
              keyword: {
                primary: 'seo workspace',
                secondary: `${domain}/products/seo`,
              },
              volume: '1.900',
              position: '5',
              traffic: '840',
            },
          },
          {
            id: 'd3',
            tags: ['top10'],
            cells: {
              keyword: {
                primary: 'market seo toolkit',
                secondary: `${domain}/toolkit`,
              },
              volume: '2.100',
              position: '8',
              traffic: '620',
            },
          },
          {
            id: 'd4',
            tags: ['top10'],
            cells: {
              keyword: {
                primary: 'rank tracking api',
                secondary: `${domain}/docs/rank-api`,
              },
              volume: '880',
              position: '9',
              traffic: '310',
            },
          },
          {
            id: 'd5',
            tags: ['mid'],
            cells: {
              keyword: {
                primary: 'collection seo',
                secondary: `${domain}/collections`,
              },
              volume: '720',
              position: '12',
              traffic: '190',
            },
          },
          {
            id: 'd6',
            tags: ['mid'],
            cells: {
              keyword: {
                primary: 'backlink pulse',
                secondary: `${domain}/backlinks`,
              },
              volume: '320',
              position: '14',
              traffic: '95',
            },
          },
          {
            id: 'd7',
            tags: ['mid'],
            cells: {
              keyword: {
                primary: 'gsc performance queries',
                secondary: `${domain}/gsc`,
              },
              volume: '540',
              position: '17',
              traffic: '110',
            },
          },
          {
            id: 'd8',
            tags: ['deep'],
            cells: {
              keyword: {
                primary: 'domain organic keywords',
                secondary: `${domain}/organic`,
              },
              volume: '1.100',
              position: '22',
              traffic: '140',
            },
          },
          {
            id: 'd9',
            tags: ['deep'],
            cells: {
              keyword: {
                primary: 'competitor serp overlap',
                secondary: `${domain}/competitors`,
              },
              volume: '260',
              position: '28',
              traffic: '48',
            },
          },
          {
            id: 'd10',
            tags: ['deep'],
            cells: {
              keyword: {
                primary: 'brand search console',
                secondary: `${domain}/brand`,
              },
              volume: '190',
              position: '34',
              traffic: '32',
            },
          },
          {
            id: 'd11',
            tags: ['deep'],
            cells: {
              keyword: {
                primary: 'acme demo login',
                secondary: `${domain}/login`,
              },
              volume: '410',
              position: '41',
              traffic: '55',
            },
          },
          {
            id: 'd12',
            tags: ['deep'],
            cells: {
              keyword: {
                primary: 'open seo alternative',
                secondary: `${domain}/compare`,
              },
              volume: '980',
              position: '47',
              traffic: '70',
            },
          },
        ],
        aside: {
          charts: [
            {
              kind: 'series',
              title: 'Organic traffic · 12 mo',
              height: 168,
              series: [
                {
                  id: 'traffic',
                  label: 'Traffic',
                  points: [
                    { label: 'Sep', value: 12.1 },
                    { label: 'Oct', value: 12.8 },
                    { label: 'Nov', value: 13.4 },
                    { label: 'Dec', value: 14.2 },
                    { label: 'Jan', value: 15.1 },
                    { label: 'Feb', value: 15.8 },
                    { label: 'Mar', value: 16.4 },
                    { label: 'Apr', value: 16.9 },
                    { label: 'May', value: 17.2 },
                    { label: 'Jun', value: 17.6 },
                    { label: 'Jul', value: 18.0 },
                    { label: 'Aug', value: 18.4 },
                  ],
                },
              ],
            },
            {
              kind: 'plot',
              variant: 'bar',
              title: 'Keywords by position',
              height: 148,
              points: [
                { label: '1–3', value: 42 },
                { label: '4–10', value: 186 },
                { label: '11–20', value: 310 },
                { label: '21+', value: 582 },
              ],
            },
          ],
          ledger: {
            title: 'Top pages',
            meta: '8 ranking URLs',
            columns: [
              { key: 'page', label: 'Page', dual: true },
              { key: 'traffic', label: 'Traffic', align: 'end' },
              { key: 'keywords', label: 'KW', align: 'end' },
            ],
            rows: [
              {
                id: 'p1',
                tone: 'pos',
                cells: {
                  page: { primary: 'Home', secondary: `${domain}/` },
                  traffic: '4.8k',
                  keywords: '86',
                },
              },
              {
                id: 'p2',
                cells: {
                  page: {
                    primary: 'SEO workspace',
                    secondary: `${domain}/products/seo`,
                  },
                  traffic: '2.2k',
                  keywords: '34',
                },
              },
              {
                id: 'p3',
                cells: {
                  page: {
                    primary: 'Toolkit',
                    secondary: `${domain}/toolkit`,
                  },
                  traffic: '1.1k',
                  keywords: '22',
                },
              },
              {
                id: 'p4',
                cells: {
                  page: {
                    primary: 'Rank API docs',
                    secondary: `${domain}/docs/rank-api`,
                  },
                  traffic: '640',
                  keywords: '18',
                },
              },
              {
                id: 'p5',
                cells: {
                  page: {
                    primary: 'Collections',
                    secondary: `${domain}/collections`,
                  },
                  traffic: '420',
                  keywords: '12',
                },
              },
              {
                id: 'p6',
                cells: {
                  page: {
                    primary: 'Backlinks hub',
                    secondary: `${domain}/backlinks`,
                  },
                  traffic: '280',
                  keywords: '9',
                },
              },
              {
                id: 'p7',
                cells: {
                  page: {
                    primary: 'Compare',
                    secondary: `${domain}/compare`,
                  },
                  traffic: '210',
                  keywords: '7',
                },
              },
              {
                id: 'p8',
                cells: {
                  page: {
                    primary: 'Login',
                    secondary: `${domain}/login`,
                  },
                  traffic: '95',
                  keywords: '4',
                },
              },
            ],
          },
        },
      }

    case 'backlinks':
      return {
        chapter,
        title: 'Backlinks',
        projectId,
        projectName,
        domain,
        lede: 'Referring pages, ratings, and anchor targets — OpenSEO-depth report.',
        facets: [
          { kind: 'source', label: 'Source', value: 'Backlinks' },
          { kind: 'scope', label: 'Scope', value: 'Live index · fixture' },
          { kind: 'time', label: 'Snapshot', value: day },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        stats: [
          { label: 'DR', value: '68', tone: 'pos', delta: '▲ 2' },
          { label: 'UR', value: '54' },
          { label: 'Backlinks', value: '2.840', tone: 'pos', delta: '▲ 18' },
          { label: 'Ref. domains', value: '412', tone: 'pos', delta: '▲ 13' },
        ],
        charts: [
          {
            kind: 'series',
            title: 'New & lost backlinks',
            height: 180,
            series: [
              {
                id: 'new',
                label: 'New',
                points: [
                  { label: 'W1', value: 22 },
                  { label: 'W2', value: 31 },
                  { label: 'W3', value: 18 },
                  { label: 'W4', value: 41 },
                ],
              },
              {
                id: 'lost',
                label: 'Lost',
                points: [
                  { label: 'W1', value: 8 },
                  { label: 'W2', value: 12 },
                  { label: 'W3', value: 6 },
                  { label: 'W4', value: 9 },
                ],
              },
            ],
          },
          {
            kind: 'series',
            title: 'Referring domains',
            height: 180,
            series: [
              {
                id: 'ref',
                label: 'Ref. domains',
                points: [
                  { label: 'W1', value: 381 },
                  { label: 'W2', value: 390 },
                  { label: 'W3', value: 399 },
                  { label: 'W4', value: 412 },
                ],
              },
            ],
          },
          {
            kind: 'plot',
            title: 'Ref. domains by TLD',
            variant: 'bar_horizontal',
            height: 180,
            points: [
              { label: '.com', value: 58 },
              { label: '.org', value: 14 },
              { label: '.de', value: 11 },
              { label: '.io', value: 9 },
              { label: '.net', value: 8 },
            ],
          },
        ],
        filters: [
          { id: 'all', label: 'All', tag: null },
          { id: 'dofollow', label: 'Dofollow', tag: 'dofollow' },
          { id: 'nofollow', label: 'Nofollow', tag: 'nofollow' },
          { id: 'gov', label: 'Government', tag: 'gov' },
          { id: 'edu', label: 'Educational', tag: 'edu' },
        ],
        ledgerMeta: 'Backlinks · 2.840',
        columns: [
          { key: 'page', label: 'Referring page', dual: true },
          { key: 'dr', label: 'DR', align: 'end' },
          { key: 'ur', label: 'UR', align: 'end' },
          { key: 'domains', label: 'Domains', align: 'end' },
          { key: 'links', label: 'Links', align: 'end' },
          { key: 'anchor', label: 'Anchor → target', dual: true },
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Status' },
          { key: 'seen', label: 'First / last', dual: true },
        ],
        rows: [
          {
            id: 'bl1',
            tags: ['dofollow'],
            tone: 'pos',
            cells: {
              page: {
                primary: 'Best SEO platforms in 2026',
                secondary: 'techpress.example/guides/seo-platforms',
              },
              dr: '72',
              ur: '48',
              domains: '186',
              links: '24',
              anchor: {
                primary: 'Acme SEO workspace',
                secondary: `https://${domain}/`,
              },
              type: 'Text',
              status: 'Dofollow',
              seen: { primary: '12 Aug 2026', secondary: day },
            },
          },
          {
            id: 'bl2',
            tags: ['dofollow', 'edu'],
            cells: {
              page: {
                primary: 'University digital marketing syllabus',
                secondary: 'state-u.edu/courses/mkt-410',
              },
              dr: '81',
              ur: '39',
              domains: '420',
              links: '61',
              anchor: {
                primary: 'rank tracking toolkit',
                secondary: `https://${domain}/seo/rank-tracking`,
              },
              type: 'Text',
              status: 'Dofollow',
              seen: { primary: '3 Jul 2026', secondary: '20 Sep 2026' },
            },
          },
          {
            id: 'bl3',
            tags: ['nofollow'],
            tone: 'neg',
            cells: {
              page: {
                primary: 'Weekly link roundup',
                secondary: 'forum.example/t/weekly-links/88421',
              },
              dr: '44',
              ur: '21',
              domains: '52',
              links: '140',
              anchor: {
                primary: domain,
                secondary: `https://${domain}/blog`,
              },
              type: 'Text',
              status: 'Nofollow',
              seen: { primary: '1 Sep 2026', secondary: day },
            },
          },
          {
            id: 'bl4',
            tags: ['dofollow', 'gov'],
            cells: {
              page: {
                primary: 'Public contractor directory',
                secondary: 'agency.gov/vendors/acme',
              },
              dr: '90',
              ur: '55',
              domains: '12',
              links: '8',
              anchor: {
                primary: 'Official site',
                secondary: `https://${domain}/`,
              },
              type: 'Text',
              status: 'Dofollow',
              seen: { primary: '18 May 2026', secondary: '14 Sep 2026' },
            },
          },
          {
            id: 'bl5',
            tags: ['dofollow'],
            cells: {
              page: {
                primary: 'Product hunt launch thread',
                secondary: 'producthunt.example/posts/acme-seo',
              },
              dr: '91',
              ur: '62',
              domains: '890',
              links: '33',
              anchor: {
                primary: 'Try Acme',
                secondary: `https://${domain}/start`,
              },
              type: 'Image',
              status: 'Dofollow',
              seen: { primary: '22 Jun 2026', secondary: day },
            },
          },
          {
            id: 'bl6',
            tags: ['nofollow', 'edu'],
            cells: {
              page: {
                primary: 'Student resource list',
                secondary: 'college.edu/resources/marketing',
              },
              dr: '76',
              ur: '28',
              domains: '210',
              links: '95',
              anchor: {
                primary: 'backlink pulse',
                secondary: `https://${domain}/seo/backlinks`,
              },
              type: 'Text',
              status: 'Nofollow',
              seen: { primary: '9 Aug 2026', secondary: '11 Sep 2026' },
            },
          },
        ],
      }

    case 'rank-tracking':
      return {
        chapter,
        title: 'Rank monitor',
        projectId,
        projectName,
        domain,
        facets: [
          { kind: 'source', label: 'Job', value: 'Monitor positions' },
          { kind: 'scope', label: 'Config', value: 'Weekly · DE' },
          { kind: 'time', label: 'Last check', value: day },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        searchBand: {
          seed: 'acme platform',
          seedLabel: 'Add to track',
          actionLabel: 'Track & check',
          locale: 'de',
          location: 'Germany',
          recent: ['acme platform', 'seo workspace', 'rank tracking', 'backlink pulse'],
          locales: [
            { value: 'de', label: 'DE' },
            { value: 'en', label: 'EN' },
            { value: 'fr', label: 'FR' },
          ],
        },
        stats: [
          { label: 'Monitored', value: '24' },
          { label: 'Top 10', value: '9', tone: 'pos', delta: '▲ 2' },
          { label: 'Improved', value: '6', tone: 'pos', delta: '▲' },
          { label: 'Declined', value: '3', tone: 'neg', delta: '▼' },
        ],
        filters: [
          { id: 'all', label: 'All', tag: null },
          { id: 'up', label: 'Improved', tag: 'up' },
          { id: 'down', label: 'Declined', tag: 'down' },
          { id: 'top10', label: 'Top 10', tag: 'top10' },
        ],
        ledgerMeta: 'Monitored set · 12',
        pageSize: 6,
        columns: [
          { key: 'keyword', label: 'Tracked', dual: true },
          { key: 'position', label: 'Pos.', align: 'end' },
          { key: 'previous', label: 'Prev.', align: 'end' },
          { key: 'change', label: 'Δ', align: 'end' },
          { key: 'device', label: 'Device' },
          { key: 'checked', label: 'Checked' },
        ],
        rows: [
          {
            id: 'r1',
            tags: ['up', 'top10'],
            tone: 'pos',
            cells: {
              keyword: {
                primary: 'acme platform',
                secondary: `${domain}/`,
              },
              position: '4',
              previous: '6',
              change: '▲ 2',
              device: 'Desktop',
              checked: day,
            },
          },
          {
            id: 'r2',
            tags: ['up'],
            tone: 'pos',
            cells: {
              keyword: {
                primary: 'seo workspace',
                secondary: `${domain}/products/seo`,
              },
              position: '11',
              previous: '12',
              change: '▲ 1',
              device: 'Desktop',
              checked: day,
            },
          },
          {
            id: 'r3',
            tags: ['down'],
            tone: 'neg',
            cells: {
              keyword: {
                primary: 'rank tracking',
                secondary: `${domain}/seo/rank-tracking`,
              },
              position: '18',
              previous: '15',
              change: '▼ 3',
              device: 'Desktop',
              checked: day,
            },
          },
          {
            id: 'r4',
            tags: ['top10'],
            cells: {
              keyword: {
                primary: 'backlink pulse',
                secondary: `${domain}/seo/backlinks`,
              },
              position: '7',
              previous: '7',
              change: '—',
              device: 'Desktop',
              checked: day,
            },
          },
          {
            id: 'r5',
            tags: ['up', 'top10'],
            tone: 'pos',
            cells: {
              keyword: {
                primary: 'collection seo',
                secondary: `${domain}/collections`,
              },
              position: '9',
              previous: '14',
              change: '▲ 5',
              device: 'Mobile',
              checked: day,
            },
          },
          {
            id: 'r6',
            tags: ['down'],
            tone: 'neg',
            cells: {
              keyword: {
                primary: 'market seo toolkit',
                secondary: `${domain}/toolkit`,
              },
              position: '22',
              previous: '19',
              change: '▼ 3',
              device: 'Desktop',
              checked: day,
            },
          },
          {
            id: 'r7',
            tags: ['up', 'top10'],
            tone: 'pos',
            cells: {
              keyword: {
                primary: 'gsc performance',
                secondary: `${domain}/gsc`,
              },
              position: '5',
              previous: '8',
              change: '▲ 3',
              device: 'Desktop',
              checked: day,
            },
          },
          {
            id: 'r8',
            tags: ['top10'],
            cells: {
              keyword: {
                primary: 'domain organic',
                secondary: `${domain}/organic`,
              },
              position: '10',
              previous: '10',
              change: '—',
              device: 'Mobile',
              checked: day,
            },
          },
          {
            id: 'r9',
            tags: ['down'],
            tone: 'neg',
            cells: {
              keyword: {
                primary: 'competitor overlap',
                secondary: `${domain}/competitors`,
              },
              position: '31',
              previous: '27',
              change: '▼ 4',
              device: 'Desktop',
              checked: day,
            },
          },
          {
            id: 'r10',
            tags: ['up'],
            tone: 'pos',
            cells: {
              keyword: {
                primary: 'brand search console',
                secondary: `${domain}/brand`,
              },
              position: '16',
              previous: '21',
              change: '▲ 5',
              device: 'Desktop',
              checked: day,
            },
          },
          {
            id: 'r11',
            tags: ['top10'],
            cells: {
              keyword: {
                primary: 'acme demo login',
                secondary: `${domain}/login`,
              },
              position: '8',
              previous: '9',
              change: '▲ 1',
              device: 'Mobile',
              checked: day,
            },
          },
          {
            id: 'r12',
            tags: ['up'],
            tone: 'pos',
            cells: {
              keyword: {
                primary: 'open seo alternative',
                secondary: `${domain}/compare`,
              },
              position: '13',
              previous: '17',
              change: '▲ 4',
              device: 'Desktop',
              checked: day,
            },
          },
        ],
        aside: {
          charts: [
            {
              kind: 'series',
              title: 'Visibility over time · 8 weeks',
              invertY: true,
              height: 168,
              series: [
                {
                  id: 'avg',
                  label: 'Avg position',
                  points: [
                    { label: 'W1', value: 18.4 },
                    { label: 'W2', value: 17.2 },
                    { label: 'W3', value: 16.5 },
                    { label: 'W4', value: 15.8 },
                    { label: 'W5', value: 15.1 },
                    { label: 'W6', value: 14.4 },
                    { label: 'W7', value: 14.0 },
                    { label: 'W8', value: 13.8 },
                  ],
                },
              ],
            },
            {
              kind: 'plot',
              variant: 'bar',
              title: 'Position distribution',
              height: 148,
              points: [
                { label: '1–3', value: 3 },
                { label: '4–10', value: 6 },
                { label: '11–20', value: 8 },
                { label: '21+', value: 7 },
              ],
            },
          ],
          ledger: {
            title: 'Biggest movers',
            meta: 'This check · vs previous',
            columns: [
              { key: 'keyword', label: 'Tracked', dual: true },
              { key: 'change', label: 'Δ', align: 'end' },
            ],
            rows: [
              {
                id: 'm1',
                tone: 'pos',
                cells: {
                  keyword: {
                    primary: 'collection seo',
                    secondary: '14 → 9',
                  },
                  change: '▲ 5',
                },
              },
              {
                id: 'm2',
                tone: 'pos',
                cells: {
                  keyword: {
                    primary: 'brand search console',
                    secondary: '21 → 16',
                  },
                  change: '▲ 5',
                },
              },
              {
                id: 'm3',
                tone: 'pos',
                cells: {
                  keyword: {
                    primary: 'open seo alternative',
                    secondary: '17 → 13',
                  },
                  change: '▲ 4',
                },
              },
              {
                id: 'm4',
                tone: 'neg',
                cells: {
                  keyword: {
                    primary: 'competitor overlap',
                    secondary: '27 → 31',
                  },
                  change: '▼ 4',
                },
              },
              {
                id: 'm5',
                tone: 'neg',
                cells: {
                  keyword: {
                    primary: 'rank tracking',
                    secondary: '15 → 18',
                  },
                  change: '▼ 3',
                },
              },
              {
                id: 'm6',
                tone: 'neg',
                cells: {
                  keyword: {
                    primary: 'market seo toolkit',
                    secondary: '19 → 22',
                  },
                  change: '▼ 3',
                },
              },
            ],
          },
        },
      }

    case 'competitors':
      return {
        chapter,
        title: 'Competitive field',
        projectId,
        projectName,
        domain,
        facets: [
          { kind: 'source', label: 'Job', value: 'SERP overlap' },
          { kind: 'scope', label: 'Keyword set', value: '12 terms · DE' },
          { kind: 'time', label: 'Last run', value: day },
          { kind: 'mode', label: 'Mode', value: 'Fixture' },
        ],
        searchBand: {
          seed: 'acme platform, seo workspace',
          seedLabel: 'Keyword set',
          actionLabel: 'Analyze',
          allowEmptySeed: true,
          locale: 'de',
          location: 'Germany',
          recent: [
            'acme platform, seo workspace',
            'rank tracking, backlink pulse',
            'collection seo',
          ],
          locales: [
            { value: 'de', label: 'DE' },
            { value: 'en', label: 'EN' },
            { value: 'fr', label: 'FR' },
          ],
        },
        stats: [
          { label: 'Rivals', value: '8' },
          { label: 'Avg overlap', value: '5,6' },
          { label: 'Best avg rank', value: '6,2', tone: 'neg' },
          { label: 'High threats', value: '3', tone: 'neg', delta: '▲ 1' },
        ],
        filters: [
          { id: 'all', label: 'All', tag: null },
          { id: 'high', label: 'High threat', tag: 'high' },
          { id: 'mid', label: 'Mid', tag: 'mid' },
          { id: 'low', label: 'Low', tag: 'low' },
        ],
        ledgerMeta: 'Rival domains · 8',
        pageSize: 5,
        columns: [
          { key: 'domain', label: 'Rival', dual: true },
          { key: 'overlap', label: 'Overlap', align: 'end' },
          { key: 'avgRank', label: 'Avg rank', align: 'end' },
          { key: 'threat', label: 'Threat' },
        ],
        rows: [
          {
            id: 'c1',
            tags: ['high'],
            tone: 'neg',
            cells: {
              domain: {
                primary: 'rival.io',
                secondary: 'acme platform · seo workspace · rank tracking',
              },
              overlap: '9',
              avgRank: '6,2',
              threat: 'High',
            },
          },
          {
            id: 'c2',
            tags: ['high'],
            tone: 'neg',
            cells: {
              domain: {
                primary: 'seo-kit.app',
                secondary: 'seo workspace · market seo toolkit · gsc performance',
              },
              overlap: '7',
              avgRank: '8,4',
              threat: 'High',
            },
          },
          {
            id: 'c3',
            tags: ['high'],
            tone: 'neg',
            cells: {
              domain: {
                primary: 'ranklab.com',
                secondary: 'rank tracking · open seo alternative',
              },
              overlap: '6',
              avgRank: '7,1',
              threat: 'High',
            },
          },
          {
            id: 'c4',
            tags: ['mid'],
            cells: {
              domain: {
                primary: 'pulsehq.dev',
                secondary: 'backlink pulse · domain organic',
              },
              overlap: '5',
              avgRank: '11,0',
              threat: 'Mid',
            },
          },
          {
            id: 'c5',
            tags: ['mid'],
            cells: {
              domain: {
                primary: 'serpscope.io',
                secondary: 'collection seo · brand search console',
              },
              overlap: '4',
              avgRank: '14,8',
              threat: 'Mid',
            },
          },
          {
            id: 'c6',
            tags: ['mid'],
            cells: {
              domain: {
                primary: 'linkframe.co',
                secondary: 'backlink pulse · competitor overlap',
              },
              overlap: '4',
              avgRank: '16,2',
              threat: 'Mid',
            },
          },
          {
            id: 'c7',
            tags: ['low'],
            cells: {
              domain: {
                primary: 'contentops.eu',
                secondary: 'acme demo login',
              },
              overlap: '2',
              avgRank: '22,4',
              threat: 'Low',
            },
          },
          {
            id: 'c8',
            tags: ['low'],
            cells: {
              domain: {
                primary: 'growstack.app',
                secondary: 'market seo toolkit',
              },
              overlap: '2',
              avgRank: '28,0',
              threat: 'Low',
            },
          },
        ],
        aside: {
          charts: [
            {
              kind: 'plot',
              variant: 'bar',
              title: 'Overlap by rival',
              height: 168,
              points: [
                { label: 'rival.io', value: 9 },
                { label: 'seo-kit', value: 7 },
                { label: 'ranklab', value: 6 },
                { label: 'pulsehq', value: 5 },
                { label: 'serpscope', value: 4 },
              ],
            },
            {
              kind: 'series',
              title: 'Competitive pressure · 8 weeks',
              height: 148,
              series: [
                {
                  id: 'pressure',
                  label: 'Avg rival rank (invert sense)',
                  points: [
                    { label: 'W1', value: 14.2 },
                    { label: 'W2', value: 13.8 },
                    { label: 'W3', value: 12.9 },
                    { label: 'W4', value: 12.1 },
                    { label: 'W5', value: 11.4 },
                    { label: 'W6', value: 10.8 },
                    { label: 'W7', value: 10.2 },
                    { label: 'W8', value: 9.6 },
                  ],
                },
              ],
            },
          ],
          ledger: {
            title: 'Battles they win',
            meta: 'Shared KW · rival ahead',
            columns: [
              { key: 'keyword', label: 'Keyword', dual: true },
              { key: 'gap', label: 'Gap', align: 'end' },
            ],
            rows: [
              {
                id: 'b1',
                tone: 'neg',
                cells: {
                  keyword: {
                    primary: 'acme platform',
                    secondary: 'rival.io #2 · you #4',
                  },
                  gap: '▼ 2',
                },
              },
              {
                id: 'b2',
                tone: 'neg',
                cells: {
                  keyword: {
                    primary: 'seo workspace',
                    secondary: 'seo-kit.app #3 · you #11',
                  },
                  gap: '▼ 8',
                },
              },
              {
                id: 'b3',
                tone: 'neg',
                cells: {
                  keyword: {
                    primary: 'rank tracking',
                    secondary: 'ranklab.com #5 · you #18',
                  },
                  gap: '▼ 13',
                },
              },
              {
                id: 'b4',
                cells: {
                  keyword: {
                    primary: 'backlink pulse',
                    secondary: 'pulsehq.dev #6 · you #7',
                  },
                  gap: '▼ 1',
                },
              },
              {
                id: 'b5',
                tone: 'neg',
                cells: {
                  keyword: {
                    primary: 'open seo alternative',
                    secondary: 'ranklab.com #4 · you #13',
                  },
                  gap: '▼ 9',
                },
              },
              {
                id: 'b6',
                cells: {
                  keyword: {
                    primary: 'market seo toolkit',
                    secondary: 'seo-kit.app #8 · you #22',
                  },
                  gap: '▼ 14',
                },
              },
            ],
          },
        },
      }
  }
}

export const SEO_CHAPTER_IDS: SeoChapterId[] = [
  'gsc',
  'keywords',
  'domain',
  'backlinks',
  'rank-tracking',
  'competitors',
]
