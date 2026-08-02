import type {
  GeoOverview,
  GeoPromptIntent,
  GeoQueryRun,
  GeoRecommendation,
} from '@checkion-v3/contracts'
import { buildGeoInsights, mergeRecommendations } from '../geo-insights'
import { buildGeoPresence, shareOfVoiceFromPresence } from '../geo-presence'

/** Rich GEO fixtures — magazine + placement (presence derived from runs). */

type GeoOverviewDraft = Omit<GeoOverview, 'presence' | 'shareOfVoice' | 'insights' | 'recommendations'> & {
  recommendations?: GeoRecommendation[]
  /** Optional fixture intent overrides (exact query text → intent). */
  queryIntents?: Partial<Record<string, GeoPromptIntent>>
}

/** Extra models for geo-1 — stresses the Queries placement strip (~10). */
const GEO1_STRESS_MODELS = [
  'gpt-5.5-mini',
  'gpt-5.5-nano',
  'claude-haiku',
  'claude-opus',
  'gemini-2.0-flash',
  'llama-4-maverick',
  'mistral-large',
] as const

/** Target positions for stress models (null = miss). Matrix uses 0 for miss. */
const GEO1_STRESS_POS: Array<number | null> = [1, 2, null, 3, 1, null, 2]

function stressExpandGeo1(draft: GeoOverviewDraft): GeoOverviewDraft {
  const extras = [...GEO1_STRESS_MODELS]
  const models = [...draft.models, ...extras]
  const extraRuns: GeoQueryRun[] = []

  for (const query of draft.queries) {
    const seed = draft.queryRuns.find((r) => r.query === query)
    if (!seed) continue
    extras.forEach((modelId, i) => {
      const ourPosition = GEO1_STRESS_POS[i % GEO1_STRESS_POS.length] ?? null
      const citations =
        ourPosition == null
          ? [
              { domain: 'abb.com', position: 1 },
              { domain: 'fanuc.com', position: 2 },
            ]
          : ourPosition === 1
            ? [
                { domain: draft.targetHost, position: 1, context: 'stress cite' },
                { domain: 'abb.com', position: 2 },
              ]
            : [
                { domain: 'abb.com', position: 1 },
                {
                  domain: draft.targetHost,
                  position: ourPosition,
                  context: 'stress cite',
                },
              ]
      extraRuns.push({
        queryId: seed.queryId,
        query: seed.query,
        modelId,
        answerText: `${modelId} stress answer for “${query}”. ${
          ourPosition == null
            ? 'Target not cited in this run.'
            : `Target cited at #${ourPosition}.`
        }`,
        ourPosition,
        citations,
      })
    })
  }

  const positionMatrix = draft.positionMatrix.map((row) => {
    const positions = { ...row.positions }
    extras.forEach((modelId, i) => {
      const ourPosition = GEO1_STRESS_POS[i % GEO1_STRESS_POS.length] ?? null
      positions[modelId] = ourPosition == null ? 0 : ourPosition
    })
    return { ...row, positions }
  })

  return {
    ...draft,
    models,
    positionMatrix,
    queryRuns: [...draft.queryRuns, ...extraRuns],
    job: {
      ...draft.job,
      modelCount: models.length,
    },
  }
}

function finalize(draft: GeoOverviewDraft): GeoOverview {
  const { queryIntents, recommendations: fixtureRecs = [], ...rest } = draft
  const presence = buildGeoPresence({
    targetHost: rest.targetHost,
    competitors: rest.competitors,
    queries: rest.queries,
    queryRuns: rest.queryRuns,
  })
  const shareOfVoice = shareOfVoiceFromPresence(presence)
  const insights = buildGeoInsights({
    targetHost: rest.targetHost,
    queries: rest.queries,
    queryRuns: rest.queryRuns,
    rivals: presence.rivals,
    shareOfVoice,
    queryIntents,
    solo: presence.solo,
  })
  return {
    ...rest,
    recommendations: mergeRecommendations(insights.moves, fixtureRecs),
    presence,
    shareOfVoice,
    insights,
    job: {
      ...rest.job,
      citedShare: presence.solo.citedShare,
    },
  }
}

const GEO_DRAFTS: GeoOverviewDraft[] = [
  {
    job: {
      id: 'geo-1',
      title: 'Competitive GEO — Dürr paint systems',
      projectId: 'proj-demo-1',
      url: 'https://www.durr.com',
      status: 'completed',
      overallScore: 58,
      completedAt: '2026-07-28T12:00:00.000Z',
      queryCount: 4,
      modelCount: 3,
      citedShare: 58,
    },
    lede:
      'Answer engines treat Dürr as a technical authority on paint application — and as an optional third name when the prompt turns into a supplier beauty contest.',
    targetHost: 'durr.com',
    eeat: {
      experience: 62,
      expertise: 71,
      authoritativeness: 54,
      trustworthiness: 68,
      geoFitness: 51,
    },
    recommendations: [
      {
        id: 'geo-rec-1',
        title: 'Win comparison prompts with proof pages',
        severity: 'high',
        body: 'Models prefer competitor case libraries when the query asks “which supplier”. Publish side-by-side application outcomes with measurable KPIs.',
      },
      {
        id: 'geo-rec-2',
        title: 'Surface author + plant expertise',
        severity: 'medium',
        body: 'E-E-A-T expertise is solid on product hubs but thin on editorial surfaces that LLMs quote. Add named process engineers on technical deep-dives.',
      },
      {
        id: 'geo-rec-3',
        title: 'Stabilize citation snippets',
        severity: 'low',
        body: 'When cited, position is often 2–3. Tighten lead paragraphs on paint application hubs so models lift your definition first.',
      },
    ],
    models: ['gpt-5.4', 'claude-sonnet', 'gemini-2.5'],
    queries: [
      'Best paint application systems for automotive OEMs',
      'Who leads in robotic painting booth technology?',
      'Dürr vs ABB vs Eisenmann for final assembly painting',
      'How to reduce overspray in automotive paint shops',
    ],
    competitors: ['abb.com', 'eisenmann.com', 'fanuc.com'],
    queryIntents: {
      'Best paint application systems for automotive OEMs': 'other',
      'Who leads in robotic painting booth technology?': 'other',
      'Dürr vs ABB vs Eisenmann for final assembly painting': 'comparison',
      'How to reduce overspray in automotive paint shops': 'how-to',
    },
    positionMatrix: [
      {
        queryIndex: 1,
        queryLabel: 'Q1',
        queryText: 'Best paint application systems for automotive OEMs',
        positions: { 'gpt-5.4': 2, 'claude-sonnet': 1, 'gemini-2.5': 3 },
      },
      {
        queryIndex: 2,
        queryLabel: 'Q2',
        queryText: 'Who leads in robotic painting booth technology?',
        positions: { 'gpt-5.4': 1, 'claude-sonnet': 2, 'gemini-2.5': 0 },
      },
      {
        queryIndex: 3,
        queryLabel: 'Q3',
        queryText: 'Dürr vs ABB vs Eisenmann for final assembly painting',
        positions: { 'gpt-5.4': 3, 'claude-sonnet': 0, 'gemini-2.5': 2 },
      },
      {
        queryIndex: 4,
        queryLabel: 'Q4',
        queryText: 'How to reduce overspray in automotive paint shops',
        positions: { 'gpt-5.4': 2, 'claude-sonnet': 1, 'gemini-2.5': 1 },
      },
    ],
    queryRuns: [
      {
        queryId: 'q1',
        query: 'Best paint application systems for automotive OEMs',
        modelId: 'gpt-5.4',
        answerText:
          'Automotive OEMs typically evaluate paint application lines on transfer efficiency, booth footprint, and integration with final assembly. Dürr and ABB appear frequently in procurement shortlists for atomizer and booth packages; Eisenmann remains strong in oven and conveyor-adjacent systems.',
        ourPosition: 2,
        citations: [
          { domain: 'abb.com', position: 1, context: 'robotic atomizers' },
          { domain: 'durr.com', position: 2, context: 'EcoPaintJet / application' },
          { domain: 'eisenmann.com', position: 3, context: 'paint shop lines' },
        ],
      },
      {
        queryId: 'q1',
        query: 'Best paint application systems for automotive OEMs',
        modelId: 'claude-sonnet',
        answerText:
          'For OEM paint shops, the leaders cited most often are Dürr for high-efficiency application and ABB for robotic cells. Selection depends on whether the plant prioritizes overspray reduction or throughput.',
        ourPosition: 1,
        citations: [
          { domain: 'durr.com', position: 1, context: 'overspray reduction' },
          { domain: 'abb.com', position: 2, context: 'robotic painting' },
        ],
      },
      {
        queryId: 'q1',
        query: 'Best paint application systems for automotive OEMs',
        modelId: 'gemini-2.5',
        answerText:
          'Industry references point to ABB and FANUC for robotic painting arms, with Dürr often mentioned for complete paint shop engineering.',
        ourPosition: 3,
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'fanuc.com', position: 2 },
          { domain: 'durr.com', position: 3, context: 'paint shop engineering' },
        ],
      },
      {
        queryId: 'q2',
        query: 'Who leads in robotic painting booth technology?',
        modelId: 'gpt-5.4',
        answerText:
          'Dürr is frequently named for integrated booth and application packages; ABB leads on manipulator ecosystems. Leadership depends on whether “booth” means enclosure + HVAC or the robot cell alone.',
        ourPosition: 1,
        citations: [
          { domain: 'durr.com', position: 1, context: 'booth + application' },
          { domain: 'abb.com', position: 2 },
        ],
      },
      {
        queryId: 'q2',
        query: 'Who leads in robotic painting booth technology?',
        modelId: 'claude-sonnet',
        answerText:
          'ABB and Dürr dominate citations. Claude leans ABB for robot kinematics, then Dürr for booth process control.',
        ourPosition: 2,
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'durr.com', position: 2 },
        ],
      },
      {
        queryId: 'q2',
        query: 'Who leads in robotic painting booth technology?',
        modelId: 'gemini-2.5',
        answerText:
          'Gemini’s answer emphasizes ABB and FANUC robotics without a clear Dürr citation for this framing of the question.',
        ourPosition: null,
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'fanuc.com', position: 2 },
        ],
      },
      {
        queryId: 'q3',
        query: 'Dürr vs ABB vs Eisenmann for final assembly painting',
        modelId: 'gpt-5.4',
        answerText:
          'Head-to-head prompts surface ABB first on robot cells, Eisenmann on line integration, and Dürr third when the answer stacks all three brands without a decisive winner.',
        ourPosition: 3,
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'eisenmann.com', position: 2 },
          { domain: 'durr.com', position: 3 },
        ],
      },
      {
        queryId: 'q3',
        query: 'Dürr vs ABB vs Eisenmann for final assembly painting',
        modelId: 'claude-sonnet',
        answerText:
          'Claude answers with ABB and Eisenmann process contrasts and does not cite durr.com in this run — a clear gap for competitive prompts.',
        ourPosition: null,
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'eisenmann.com', position: 2 },
        ],
      },
      {
        queryId: 'q3',
        query: 'Dürr vs ABB vs Eisenmann for final assembly painting',
        modelId: 'gemini-2.5',
        answerText:
          'Gemini lists ABB, then Dürr for application quality, then Eisenmann for turnkey lines.',
        ourPosition: 2,
        citations: [
          { domain: 'abb.com', position: 1 },
          { domain: 'durr.com', position: 2 },
          { domain: 'eisenmann.com', position: 3 },
        ],
      },
      {
        queryId: 'q4',
        query: 'How to reduce overspray in automotive paint shops',
        modelId: 'gpt-5.4',
        answerText:
          'Overspray reduction tactics include high-transfer atomizers, better booth airflow, and path planning. Dürr’s EcoPaintJet-style application is a common citation after general process advice.',
        ourPosition: 2,
        citations: [
          { domain: 'sae.org', position: 1, context: 'process guidance' },
          { domain: 'durr.com', position: 2, context: 'EcoPaintJet' },
        ],
      },
      {
        queryId: 'q4',
        query: 'How to reduce overspray in automotive paint shops',
        modelId: 'claude-sonnet',
        answerText:
          'Claude leads with Dürr application tech, then booth HVAC best practices from industry sources.',
        ourPosition: 1,
        citations: [
          { domain: 'durr.com', position: 1 },
          { domain: 'abb.com', position: 2 },
        ],
      },
      {
        queryId: 'q4',
        query: 'How to reduce overspray in automotive paint shops',
        modelId: 'gemini-2.5',
        answerText:
          'Gemini cites Dürr early for transfer efficiency, aligning with how-to prompts more than brand-comparison prompts.',
        ourPosition: 1,
        citations: [{ domain: 'durr.com', position: 1, context: 'transfer efficiency' }],
      },
    ],
  },
  {
    job: {
      id: 'geo-2',
      title: 'AI overview citations — Shop PDP',
      projectId: 'proj-demo-3',
      url: 'https://shop.msqdx.example/p/headphones',
      status: 'completed',
      overallScore: 41,
      completedAt: '2026-07-20T09:00:00.000Z',
      queryCount: 3,
      modelCount: 2,
      citedShare: 33,
    },
    lede:
      'Merchant PDPs almost never earn a cite on open “best of” prompts. Brand-exact questions are the only reliable way shop.msqdx.example enters the answer.',
    targetHost: 'shop.msqdx.example',
    eeat: {
      experience: 38,
      expertise: 44,
      authoritativeness: 36,
      trustworthiness: 52,
      geoFitness: 34,
    },
    recommendations: [
      {
        id: 'geo-rec-s1',
        title: 'Earn third-party mentions',
        severity: 'high',
        body: 'LLMs cite review hubs before merchant PDPs. Seed structured specs on pages that aggregators can lift.',
      },
      {
        id: 'geo-rec-s2',
        title: 'Answer “best for …” intents',
        severity: 'medium',
        body: 'Add comparison modules on PDPs so models have quotable differentiators beyond price.',
      },
    ],
    models: ['gpt-5.4', 'claude-sonnet'],
    queries: [
      'Best wireless headphones under €200',
      'msqdx shop headphones review',
      'Noise cancelling headphones for commuting',
    ],
    competitors: ['amazon.de', 'sony.com', 'bose.com'],
    queryIntents: {
      'Best wireless headphones under €200': 'other',
      'msqdx shop headphones review': 'branded',
      'Noise cancelling headphones for commuting': 'other',
    },
    positionMatrix: [
      {
        queryIndex: 1,
        queryLabel: 'Q1',
        queryText: 'Best wireless headphones under €200',
        positions: { 'gpt-5.4': 0, 'claude-sonnet': 0 },
      },
      {
        queryIndex: 2,
        queryLabel: 'Q2',
        queryText: 'msqdx shop headphones review',
        positions: { 'gpt-5.4': 1, 'claude-sonnet': 2 },
      },
      {
        queryIndex: 3,
        queryLabel: 'Q3',
        queryText: 'Noise cancelling headphones for commuting',
        positions: { 'gpt-5.4': 0, 'claude-sonnet': 3 },
      },
    ],
    queryRuns: [
      {
        queryId: 'sq1',
        query: 'Best wireless headphones under €200',
        modelId: 'gpt-5.4',
        answerText:
          'For sub-€200 wireless headphones, buyers usually start with Amazon bestsellers and mid-range Sony or Bose lines that balance ANC and battery life. Specialty merchants rarely appear unless the prompt names them.',
        ourPosition: null,
        citations: [
          { domain: 'amazon.de', position: 1 },
          { domain: 'sony.com', position: 2 },
        ],
      },
      {
        queryId: 'sq1',
        query: 'Best wireless headphones under €200',
        modelId: 'claude-sonnet',
        answerText:
          'Category roundups lean on Amazon and Bose at this price band. shop.msqdx.example is not named — the answer treats the space as big-box and brand-direct only.',
        ourPosition: null,
        citations: [
          { domain: 'amazon.de', position: 1 },
          { domain: 'bose.com', position: 2 },
        ],
      },
      {
        queryId: 'sq2',
        query: 'msqdx shop headphones review',
        modelId: 'gpt-5.4',
        answerText:
          'Brand-exact queries surface the merchant first: shop.msqdx.example is treated as the product home for msqdx headphones with fit and return notes.',
        ourPosition: 1,
        citations: [{ domain: 'shop.msqdx.example', position: 1, context: 'merchant PDP' }],
      },
      {
        queryId: 'sq2',
        query: 'msqdx shop headphones review',
        modelId: 'claude-sonnet',
        answerText:
          'Claude opens with a third-party review hub for listening tests, then points to the shop.msqdx.example PDP for purchase and warranty detail.',
        ourPosition: 2,
        citations: [
          { domain: 'trustedreviews.example', position: 1, context: 'listening tests' },
          { domain: 'shop.msqdx.example', position: 2, context: 'buy / warranty' },
        ],
      },
      {
        queryId: 'sq3',
        query: 'Noise cancelling headphones for commuting',
        modelId: 'gpt-5.4',
        answerText:
          'Commuting ANC advice defaults to Sony and Bose flagship lines. No specialty retailer is cited when the prompt stays category-generic.',
        ourPosition: null,
        citations: [
          { domain: 'sony.com', position: 1 },
          { domain: 'bose.com', position: 2 },
        ],
      },
      {
        queryId: 'sq3',
        query: 'Noise cancelling headphones for commuting',
        modelId: 'claude-sonnet',
        answerText:
          'Claude leads with Sony and Bose for ANC on trains, then mentions shop.msqdx.example late as an alternative retailer for mid-price packs.',
        ourPosition: 3,
        citations: [
          { domain: 'sony.com', position: 1 },
          { domain: 'bose.com', position: 2 },
          { domain: 'shop.msqdx.example', position: 3, context: 'alt retailer' },
        ],
      },
    ],
  },
  {
    job: {
      id: 'geo-3',
      title: 'Solo presence — brand hub (no rivals listed)',
      projectId: 'proj-demo-1',
      url: 'https://www.acme-brand.example',
      status: 'completed',
      overallScore: 62,
      completedAt: '2026-07-29T15:00:00.000Z',
      queryCount: 3,
      modelCount: 2,
      citedShare: 0,
    },
    lede:
      'Without a competitor list, this run measures only whether answer engines cite acme-brand.example — and on which prompts they skip it.',
    targetHost: 'acme-brand.example',
    recommendations: [
      {
        id: 'geo-rec-solo-1',
        title: 'Close the how-to miss',
        severity: 'high',
        body: 'Models answer the process question without naming you. Publish a quotable definition block that LLMs can lift as the first cite.',
      },
      {
        id: 'geo-rec-solo-2',
        title: 'Keep brand-exact wins',
        severity: 'medium',
        body: 'Brand-exact prompts already cite you first — protect those hubs; expand the same snippet pattern into category intents.',
      },
    ],
    models: ['gpt-5.4', 'claude-sonnet'],
    queries: [
      'What is acme-brand known for?',
      'How do industrial brands structure technical documentation?',
      'acme-brand.example overview',
    ],
    competitors: [],
    queryIntents: {
      'What is acme-brand known for?': 'branded',
      'How do industrial brands structure technical documentation?': 'how-to',
      'acme-brand.example overview': 'branded',
    },
    positionMatrix: [
      {
        queryIndex: 1,
        queryLabel: 'Q1',
        queryText: 'What is acme-brand known for?',
        positions: { 'gpt-5.4': 1, 'claude-sonnet': 1 },
      },
      {
        queryIndex: 2,
        queryLabel: 'Q2',
        queryText: 'How do industrial brands structure technical documentation?',
        positions: { 'gpt-5.4': 0, 'claude-sonnet': 0 },
      },
      {
        queryIndex: 3,
        queryLabel: 'Q3',
        queryText: 'acme-brand.example overview',
        positions: { 'gpt-5.4': 1, 'claude-sonnet': 1 },
      },
    ],
    queryRuns: [
      {
        queryId: 'solo-q1',
        query: 'What is acme-brand known for?',
        modelId: 'gpt-5.4',
        answerText:
          'Acme-brand is known for industrial documentation patterns and plant training hubs — models treat acme-brand.example as the canonical brand overview when the prompt is brand-aware.',
        ourPosition: 1,
        citations: [{ domain: 'acme-brand.example', position: 1, context: 'brand overview' }],
      },
      {
        queryId: 'solo-q1',
        query: 'What is acme-brand known for?',
        modelId: 'claude-sonnet',
        answerText:
          'Claude names acme-brand.example as the primary source for the brand story, emphasizing plant training programs and structured technical publishing.',
        ourPosition: 1,
        citations: [{ domain: 'acme-brand.example', position: 1 }],
      },
      {
        queryId: 'solo-q2',
        query: 'How do industrial brands structure technical documentation?',
        modelId: 'gpt-5.4',
        answerText:
          'General guidance on docs architecture — topic maps, versioned manuals, and role-based portals — with no brand citation. Process frameworks only.',
        ourPosition: null,
        citations: [],
      },
      {
        queryId: 'solo-q2',
        query: 'How do industrial brands structure technical documentation?',
        modelId: 'claude-sonnet',
        answerText:
          'Claude answers with generic information-architecture advice for industrial manuals and omits acme-brand.example even though the hub covers the same patterns.',
        ourPosition: null,
        citations: [],
      },
      {
        queryId: 'solo-q3',
        query: 'acme-brand.example overview',
        modelId: 'gpt-5.4',
        answerText:
          'Brand-exact prompts surface the hub first: acme-brand.example is summarized as the company overview with product families and training links.',
        ourPosition: 1,
        citations: [{ domain: 'acme-brand.example', position: 1 }],
      },
      {
        queryId: 'solo-q3',
        query: 'acme-brand.example overview',
        modelId: 'claude-sonnet',
        answerText:
          'Claude cites the brand hub as the sole source and restates positioning around industrial documentation and plant enablement.',
        ourPosition: 1,
        citations: [{ domain: 'acme-brand.example', position: 1 }],
      },
    ],
  },
]

export const GEO_OVERVIEWS: GeoOverview[] = GEO_DRAFTS.map((draft, index) =>
  finalize(index === 0 ? stressExpandGeo1(draft) : draft),
)
