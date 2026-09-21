import { describe, expect, it } from 'vitest'
import { asBrowserFunction } from '@/lib/scan/puppeteer-esbuild-name'

describe('asBrowserFunction', () => {
  it('returns the same function when __name is absent', () => {
    const fn = function (x: number) {
      return x + 1
    }
    expect(asBrowserFunction(fn)).toBe(fn)
  })

  it('wraps functions whose toString contains __name so the browser shim is present', () => {
    // Simulate esbuild keepNames injection inside a Puppeteer evaluate body.
    const injected = new Function(
      'stopList',
      'var inner = __name(function (a) { return a; }, "a"); return inner(stopList);',
    ) as (stopList: string) => string

    const wrapped = asBrowserFunction(injected)
    const src = Function.prototype.toString.call(wrapped)
    expect(src).toContain('var __name')
    expect(src).toContain('return target')
    expect(src).toContain('__name(function (a)')
  })
})
