/**
 * Hub list queries must stay payload-light (no full overview/issues JSONB).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const root = path.join(__dirname, '..')

describe('scan list query performance', () => {
  it('dbListScans projects light columns instead of select *', () => {
    const src = readFileSync(path.join(root, 'lib/db/scans.ts'), 'utf8')
    const start = src.indexOf('export async function dbListScans')
    const end = src.indexOf('async function dbGetScanRow', start)
    const listFn = src.slice(start, end)
    expect(listFn).toContain("payload}->'scan'->>'domainScanId'")
    expect(listFn).not.toMatch(/\.select\(\)\s*\.from\(scans\)/)
  })

  it('stale recovery only loads active statuses', () => {
    const src = readFileSync(path.join(root, 'lib/db/scans.ts'), 'utf8')
    const start = src.indexOf('async function recoverStaleBackgroundScans')
    const end = src.indexOf('function rowToScan', start)
    const recover = src.slice(start, end)
    expect(recover).toContain('inArray(domainScans.status')
    expect(recover).toContain('inArray(scans.status')
  })

  it('listProjects returns dbListProjects without scan enrich on database path', () => {
    const src = readFileSync(path.join(root, 'lib/fixtures/project-store.ts'), 'utf8')
    const start = src.indexOf('export async function listProjects')
    const end = src.indexOf('export async function listProjectsForViewer', start)
    const list = src.slice(start, end)
    expect(list).toMatch(
      /if \(isDatabaseConfigured\(\)\)[\s\S]*?return \(await dbApi\(\)\)\.dbListProjects\(\)/,
    )
  })
})
