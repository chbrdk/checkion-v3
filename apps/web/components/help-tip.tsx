'use client'

import type { ReactNode } from 'react'
import { InfoTip } from '../lib/msqdx-ui-client'
import { resolveHelpTip, type TipId } from '../lib/help-tips'
import { useHelpTipLocale } from '../lib/user-prefs'

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Resolve bilingual tip body for the Settings locale (fallback en). */
export function useHelpTip(id: TipId): { content: string; label: string } {
  const locale = useHelpTipLocale()
  return resolveHelpTip(id, locale)
}

export type LabelWithTipProps = {
  tipId: TipId
  children: ReactNode
  className?: string
  /** Optional override for InfoTip size. */
  tipSize?: 'sm' | 'md'
}

/** Visible label + DS InfoTip trigger (jargon / metrics only). */
export function LabelWithTip({ tipId, children, className, tipSize = 'sm' }: LabelWithTipProps) {
  const tip = useHelpTip(tipId)
  return (
    <span className={cx('checkion-label-with-tip', className)}>
      {children}
      <InfoTip content={tip.content} label={tip.label} size={tipSize} />
    </span>
  )
}

/** Alias for metric/jargon labels. */
export function MetricLabel(props: LabelWithTipProps) {
  return <LabelWithTip {...props} />
}
