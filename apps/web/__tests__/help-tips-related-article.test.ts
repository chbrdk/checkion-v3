/**
 * Help tips ↔ suite help articles (Wave 2).
 * Spec: specs/domain/help-tips.md · plexon-v3/specs/domain/suite-help-docs.md
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { HELP_TIPS, resolveHelpTip } from '../lib/help-tips'

const root = path.resolve(__dirname, '..')

describe('help tips relatedArticle bridge', () => {
  it('wires key tips to suite help article ids', () => {
    expect(HELP_TIPS['score.accessibility'].relatedArticle).toBe('checkion.scan.wcag-quick')
    expect(HELP_TIPS['launch.wcag'].relatedArticle).toBe('checkion.scan.wcag-quick')
    expect(HELP_TIPS['launch.depth.single'].relatedArticle).toBe('checkion.scan.wcag-quick')
    expect(HELP_TIPS['launch.depth.deep'].relatedArticle).toBe('checkion.scan.domain-deep')
    expect(HELP_TIPS['launch.seo'].relatedArticle).toBe('checkion.scan.seo-crawl')
    expect(HELP_TIPS['geo.discoverability'].relatedArticle).toBe('checkion.scan.geo-layers')
    expect(HELP_TIPS['launch.geo'].relatedArticle).toBe('checkion.scan.geo-layers')
    expect(HELP_TIPS['launch.geo.recall'].relatedArticle).toBe('checkion.scan.geo-layers')
    expect(HELP_TIPS['launch.geo.live'].relatedArticle).toBe('checkion.scan.geo-layers')
    const resolved = resolveHelpTip('launch.wcag', 'de')
    expect(resolved.relatedArticle).toBe('checkion.scan.wcag-quick')
    expect(resolved.content.length).toBeGreaterThan(10)
  })

  it('resolves tip article ids against plexon help manifest', () => {
    const plexonManifest = path.resolve(
      root,
      '../../../plexon-v3/content/help/manifest.json',
    )
    expect(existsSync(plexonManifest)).toBe(true)
    const manifest = JSON.parse(readFileSync(plexonManifest, 'utf8')) as {
      articles: Array<{ id: string }>
    }
    const ids = new Set(manifest.articles.map((a) => a.id))
    const wired = Object.values(HELP_TIPS)
      .map((t) => t.relatedArticle)
      .filter((id): id is string => Boolean(id))
    for (const id of wired) {
      expect(ids.has(id), `missing help article ${id}`).toBe(true)
    }
  })

  it('mounts PlatformHelpHost in AppShell', () => {
    const shell = readFileSync(path.join(root, 'components/app-shell.tsx'), 'utf8')
    expect(shell).toContain('PlatformHelpHost')
    expect(existsSync(path.join(root, 'components/platform-help-host.tsx'))).toBe(true)
    const tip = readFileSync(path.join(root, 'components/help-tip.tsx'), 'utf8')
    expect(tip).toContain('dispatchProductHelpOpen')
  })
})
