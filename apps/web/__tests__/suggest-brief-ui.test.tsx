import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeoSuggestBriefPanel } from '../components/seo-suggest-brief-panel'
import {
  parseSuggestBriefPayload,
  topicChips,
} from '../lib/seo-market/suggest-brief-ui'
import { UserPrefsProvider } from '../lib/user-prefs'

function wrap(ui: React.ReactElement) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

describe('suggest-brief-ui', () => {
  it('parses brief + pack provenance', () => {
    const view = parseSuggestBriefPayload({
      brief: {
        summary: 'Vaillant builds heat pumps and heating systems for installers.',
        category: 'HVAC',
        products: ['Wärmepumpe', 'Heizung'],
        services: ['Service'],
        audiences: ['Installateure', 'Wärmepumpe'],
      },
      agent: {
        steps: ['distill_brief', 'generate_keywords'],
        pagesFetched: ['https://vaillant.de/', 'https://vaillant.de/produkte/'],
        usedKnowledge: true,
        publishedToPack: true,
      },
    })
    expect(view?.brief.category).toBe('HVAC')
    expect(view?.publishedToPack).toBe(true)
    expect(view?.pagesFetched).toBe(2)
    expect(topicChips(view!.brief)).toEqual([
      'Wärmepumpe',
      'Heizung',
      'Service',
      'Installateure',
    ])
  })

  it('rejects thin summaries', () => {
    expect(
      parseSuggestBriefPayload({
        brief: {
          summary: 'too short',
          category: null,
          products: [],
          services: [],
          audiences: [],
        },
      }),
    ).toBeNull()
  })
})

describe('SeoSuggestBriefPanel', () => {
  it('renders summary, chips, and published status', () => {
    wrap(
      <SeoSuggestBriefPanel
        view={{
          brief: {
            summary: 'Vaillant builds heat pumps and heating systems for installers.',
            category: 'HVAC',
            products: ['Wärmepumpe'],
            services: [],
            audiences: ['Installateure'],
          },
          publishedToPack: true,
          publishError: undefined,
          pagesFetched: 2,
          usedKnowledge: true,
        }}
      />,
    )
    expect(screen.getByText(/Vaillant builds heat pumps/i)).toBeTruthy()
    expect(screen.getByText('Wärmepumpe')).toBeTruthy()
    expect(
      screen.getByText(/Brief merged into the Collection Knowledge Pack/i),
    ).toBeTruthy()
  })
})
