'use client'

import { useState } from 'react'
import { Button, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

type Props = {
  projectId: string
  /** When false, CTA is hidden (no real Collection binding). */
  canPublish: boolean
}

/**
 * Explicit freigabe — publish current overview into Plexon ClientRoom slot `checkion_overview`.
 */
export function PublishClientRoomCta({ projectId, canPublish }: Props) {
  const t = useT()
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  if (!canPublish) return null

  async function onPublish() {
    setStatus('busy')
    setMessage(null)
    try {
      const res = await fetch(paths.routes.apiProjectClientRoomPublish(projectId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      const body = (await res.json().catch(() => null)) as {
        error?: string
        detail?: string
        href?: string
      } | null
      if (!res.ok) {
        throw new Error(body?.detail || body?.error || t('projects.clientRoomPublishFailed'))
      }
      setStatus('done')
      setMessage(t('projects.clientRoomPublishDone'))
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : t('projects.clientRoomPublishFailed'))
    }
  }

  return (
    <div className="checkion-client-room-publish" data-section="client-room-publish">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        disabled={status === 'busy'}
        onClick={() => void onPublish()}
      >
        {status === 'busy'
          ? t('projects.clientRoomPublishing')
          : t('projects.clientRoomPublish')}
      </Button>
      {message ? (
        <Text role="meta" data-tone={status === 'error' ? 'danger' : undefined}>
          {message}
        </Text>
      ) : null}
    </div>
  )
}
