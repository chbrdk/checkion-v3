import { describe, expect, it } from 'vitest'
import {
  clarityTone,
  clsTone,
  countTone,
  ecoGradeTone,
  goodWhenTrue,
  issueStatsTone,
  timingTone,
  titleLenTone,
} from '../lib/detail-metric-tone'

describe('detail metric tones', () => {
  it('maps CWV timings like overview lab tiles', () => {
    expect(timingTone(100, 200, 500)).toBe('pos')
    expect(timingTone(300, 200, 500)).toBe('low')
    expect(timingTone(600, 200, 500)).toBe('neg')
    expect(timingTone(4060, 2500, 4000)).toBe('neg')
  })

  it('maps CLS and count heuristics', () => {
    expect(clsTone(0.05)).toBe('pos')
    expect(clsTone(0.2)).toBe('low')
    expect(clsTone(0.4)).toBe('neg')
    expect(countTone(0)).toBe('pos')
    expect(countTone(2, 1, 5)).toBe('low')
    expect(countTone(8, 1, 5)).toBe('neg')
  })

  it('maps scores, SEO length, eco, and booleans', () => {
    expect(clarityTone(72)).toBe('pos')
    expect(titleLenTone(45)).toBe('pos')
    expect(titleLenTone(10)).toBe('neg')
    expect(ecoGradeTone('A')).toBe('pos')
    expect(ecoGradeTone('D')).toBe('neg')
    expect(goodWhenTrue(true)).toBe('pos')
    expect(goodWhenTrue(false)).toBe('neg')
    expect(issueStatsTone(104, 0)).toBe('neg')
    expect(issueStatsTone(0, 3)).toBe('low')
    expect(issueStatsTone(0, 0)).toBe('pos')
  })
})
