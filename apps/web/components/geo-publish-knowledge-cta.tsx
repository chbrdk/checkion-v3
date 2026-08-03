'use client'

import { useState } from 'react'
import { Button, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'

type Props = {
  jobId: string
  /** When false, CTA is hidden (no Collection binding). */
  canPublish: boolean
}

export function GeoPublishKnowledgeCta({ jobId, canPublish }: Props) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  if (!canPublish) return null

  async function onPublish() {
    setStatus('busy')
    setMessage(null)
    try {
      const res = await fetch(paths.routes.apiGeoJobPublishKnowledge(jobId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      })
      const body = (await res.json().catch(() => null)) as {
        error?: string
        detail?: string
        revision?: number
      } | null
      if (!res.ok) {
        throw new Error(body?.detail || body?.error || `Publish failed (${res.status})`)
      }
      setStatus('done')
      setMessage(
        typeof body?.revision === 'number'
          ? `Saved to Collection knowledge (rev ${body.revision}).`
          : 'Saved to Collection knowledge.',
      )
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Publish failed')
    }
  }

  return (
    <div className="checkion-geo-publish-knowledge" data-section="geo-publish-knowledge">
      <Text role="meta">
        Shared · Save findability context to the Collection Knowledge Pack (not the full GEO
        runs).
      </Text>
      <Button
        variant="ghost"
        size="sm"
        disabled={status === 'busy' || status === 'done'}
        onClick={() => void onPublish()}
      >
        {status === 'busy'
          ? 'Publishing…'
          : status === 'done'
            ? 'Saved to Collection'
            : 'Save findability context to Collection'}
      </Button>
      {message ? (
        <Text role="meta" data-tone={status === 'error' ? 'danger' : undefined}>
          {message}
        </Text>
      ) : null}
    </div>
  )
}
