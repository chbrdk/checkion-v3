'use client'

import { useUserPrefs } from '../lib/user-prefs'

/** In-page lead under the persistent AppShell stage. */
export function PageLead({
  description,
  descriptionKey,
}: {
  description?: string
  descriptionKey?: string
}) {
  const { t } = useUserPrefs()
  const text = descriptionKey ? t(descriptionKey) : description
  if (!text) return null
  return <p className="checkion-page-lead">{text}</p>
}
