import type { DomainScanControlAction, ScanStatus } from '@checkion-v3/contracts'
import type { DomainScanControlState } from './spider'

export function readDomainScanControlState(status: ScanStatus | string | null | undefined): DomainScanControlState {
  if (status === 'cancelling' || status === 'cancelled') return 'cancel'
  if (status === 'paused') return 'pause'
  return 'run'
}

export function isActiveDomainScanStatus(status: string | null | undefined): boolean {
  return (
    status === 'queued' ||
    status === 'running' ||
    status === 'paused' ||
    status === 'cancelling'
  )
}

export function isDomainScanPollStatus(status: string | null | undefined): boolean {
  return isActiveDomainScanStatus(status)
}

export type DomainScanControlResult =
  | { ok: true; status: ScanStatus; message?: string }
  | { ok: false; status: ScanStatus; error: string }

export function applyDomainScanControlAction(
  current: ScanStatus | string,
  action: DomainScanControlAction,
): DomainScanControlResult {
  if (action === 'pause') {
    if (current === 'running' || current === 'queued') {
      return { ok: true, status: 'paused' }
    }
    if (current === 'paused') {
      return { ok: true, status: 'paused', message: 'Already paused' }
    }
    return { ok: false, status: current as ScanStatus, error: `Cannot pause scan in status "${current}"` }
  }

  if (action === 'resume') {
    if (current === 'paused') {
      return { ok: true, status: 'running' }
    }
    if (current === 'running') {
      return { ok: true, status: 'running', message: 'Already running' }
    }
    return { ok: false, status: current as ScanStatus, error: `Cannot resume scan in status "${current}"` }
  }

  if (current === 'completed' || current === 'failed' || current === 'cancelled') {
    return { ok: false, status: current as ScanStatus, error: `Cannot cancel scan in status "${current}"` }
  }
  if (current === 'cancelling') {
    return { ok: true, status: 'cancelled', message: 'Scan marked as cancelled' }
  }
  return { ok: true, status: 'cancelling' }
}
