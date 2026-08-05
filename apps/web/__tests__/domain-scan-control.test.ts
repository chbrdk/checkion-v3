/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import {
  applyDomainScanControlAction,
  isActiveDomainScanStatus,
  readDomainScanControlState,
} from '../lib/scan/domain-scan-control'

describe('domain-scan-control', () => {
  it('maps DB status to spider control state', () => {
    expect(readDomainScanControlState('running')).toBe('run')
    expect(readDomainScanControlState('paused')).toBe('pause')
    expect(readDomainScanControlState('cancelling')).toBe('cancel')
  })

  it('pauses running crawls', () => {
    const result = applyDomainScanControlAction('running', 'pause')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.status).toBe('paused')
  })

  it('resumes paused crawls', () => {
    const result = applyDomainScanControlAction('paused', 'resume')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.status).toBe('running')
  })

  it('forces cancelled when cancelling again', () => {
    const result = applyDomainScanControlAction('cancelling', 'cancel')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.status).toBe('cancelled')
  })

  it('treats paused crawls as active for polling', () => {
    expect(isActiveDomainScanStatus('paused')).toBe(true)
    expect(isActiveDomainScanStatus('completed')).toBe(false)
  })
})
