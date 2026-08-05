import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CHECKION_V3_TOOL_NAMES } from './tools.js'

describe('checkion-v3 MCP tool inventory', () => {
  it('exports a non-empty unique tool list with v3 prefix', () => {
    assert.ok(CHECKION_V3_TOOL_NAMES.length >= 20)
    const set = new Set(CHECKION_V3_TOOL_NAMES)
    assert.equal(set.size, CHECKION_V3_TOOL_NAMES.length)
    for (const name of CHECKION_V3_TOOL_NAMES) {
      assert.ok(name.startsWith('checkion_v3.'), name)
    }
  })

  it('includes core scan / domain / geo tools', () => {
    for (const required of [
      'checkion_v3.health',
      'checkion_v3.scan_start',
      'checkion_v3.domain_scan_start',
      'checkion_v3.domain_scan_control',
      'checkion_v3.geo_job_start',
    ] as const) {
      assert.ok(CHECKION_V3_TOOL_NAMES.includes(required), required)
    }
  })
})
