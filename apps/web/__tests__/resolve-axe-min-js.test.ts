import { describe, expect, it } from 'vitest'
import { resolveAxeMinJsPath, readAxeMinJsSource } from '../lib/scan/resolve-axe-min-js'

describe('resolve-axe-min-js', () => {
  it('resolves axe.min.js from node_modules without webpack module ids', () => {
    const filePath = resolveAxeMinJsPath()
    expect(filePath).toBeTruthy()
    expect(typeof filePath).toBe('string')
    expect(filePath!).toMatch(/axe\.min\.js$/)
    const source = readAxeMinJsSource()
    expect(source).toBeTruthy()
    expect(source!.length).toBeGreaterThan(1000)
    expect(source!).toMatch(/axe/i)
  })
})
