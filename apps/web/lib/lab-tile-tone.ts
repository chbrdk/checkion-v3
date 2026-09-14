import type { LabTileTone } from '@msqdx/ui'
import type { ScoreBandTone } from './scan-display'

/** Map Checkion score bands onto DS LabTile tones. */
export function toLabTileTone(
  tone: ScoreBandTone | LabTileTone | null | undefined,
): LabTileTone {
  if (tone === 'pos' || tone === 'low' || tone === 'neg') return tone
  if (tone === 'mid') return 'low'
  return 'neutral'
}
