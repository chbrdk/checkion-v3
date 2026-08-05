/** @vitest-environment node */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../..')

describe('checkion-v3 MCP packaging', () => {
  it('ships mcp-server package with Dockerfile and v3 tool prefix', () => {
    expect(existsSync(resolve(repoRoot, 'mcp-server/package.json'))).toBe(true)
    expect(existsSync(resolve(repoRoot, 'mcp-server/Dockerfile'))).toBe(true)
    expect(existsSync(resolve(repoRoot, 'specs/domain/mcp-server.md'))).toBe(true)

    const tools = readFileSync(resolve(repoRoot, 'mcp-server/src/tools.ts'), 'utf8')
    expect(tools).toContain('checkion_v3.health')
    expect(tools).toContain('checkion_v3.domain_scan_control')
    expect(tools).toContain('checkion_v3.geo_job_start')
  })
})
