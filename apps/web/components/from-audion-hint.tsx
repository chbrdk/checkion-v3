'use client'

import { Hint } from '@msqdx/ui'
import type { ScanOverview } from '@checkion-v3/contracts'
import { useT } from '../lib/user-prefs'

export function FromAudionHint({ scan }: { scan: ScanOverview['scan'] }) {
  const t = useT()
  return (
    <Hint panel>
      {t('results.fromAudion')}
      {scan.audionRunId ? t('results.fromAudionRun', { id: scan.audionRunId }) : ''}
      {scan.stepUrl && scan.stepUrl !== scan.url
        ? t('results.fromAudionStep', { url: scan.stepUrl })
        : ''}
      {scan.platformProjectId
        ? t('results.fromAudionCollection', { id: scan.platformProjectId })
        : ''}
      {'. '}
      {t('results.fromAudionTail')}
    </Hint>
  )
}
