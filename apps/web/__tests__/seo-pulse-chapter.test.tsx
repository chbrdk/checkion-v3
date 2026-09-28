import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeoPulseChapter } from '../components/seo-pulse-chapter'
import type { ProjectSeoPulse } from '../lib/seo-market/project-seo-pulse'

const emptyPulse: ProjectSeoPulse = {
  projectId: 'p1',
  href: '/projects/p1/seo',
  hasData: false,
  meters: [
    { id: 'tracked', value: '—', linked: false },
    { id: 'refDomains', value: '—', linked: false },
    { id: 'organicKw', value: '—', linked: false },
    { id: 'gscClicks', value: '—', linked: false },
  ],
}

const filledPulse: ProjectSeoPulse = {
  projectId: 'p1',
  href: '/projects/p1/seo',
  hasData: true,
  meters: [
    { id: 'tracked', value: '5', linked: true },
    { id: 'refDomains', value: '12', linked: true },
    { id: 'organicKw', value: '1.5K', linked: true },
    { id: 'gscClicks', value: '15', linked: true },
  ],
}

describe('SeoPulseChapter', () => {
  it('renders empty state with CTA when hasData is false', () => {
    render(<SeoPulseChapter pulse={emptyPulse} />)
    expect(screen.getByRole('heading', { name: /SEO pulse/i })).toBeTruthy()
    expect(screen.getByText(/No SEO Market data yet/i)).toBeTruthy()
    expect(screen.queryByText('Tracked')).toBeNull()
    const links = screen.getAllByRole('link', { name: /Open SEO/i })
    expect(links.every((el) => el.getAttribute('href') === '/projects/p1/seo')).toBe(true)
  })

  it('renders meters when hasData is true', () => {
    render(<SeoPulseChapter pulse={filledPulse} />)
    expect(screen.getByText('Tracked')).toBeTruthy()
    expect(screen.getByText('Ref. domains')).toBeTruthy()
    expect(screen.getByText('Organic KW')).toBeTruthy()
    expect(screen.getByText('GSC clicks')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.queryByText(/No SEO Market data yet/i)).toBeNull()
  })
})
