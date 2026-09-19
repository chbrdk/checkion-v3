'use client'

import { useEffect, useState } from 'react'
import { Button, EmptyState, Field, Input, Panel, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { isRealPlatformProjectId } from '../lib/plexon-platform-id'
import { useT } from '../lib/user-prefs'

type TeamRow = {
  id: string
  email: string
  role: string
  status: string
}

export function ProjectTeamPanel({
  projectId,
  platformProjectId,
}: {
  projectId: string
  platformProjectId?: string | null
}) {
  const t = useT()
  const bound = isRealPlatformProjectId(platformProjectId)
  const [items, setItems] = useState<TeamRow[]>([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function reload() {
    if (!bound) return
    const res = await fetch(paths.routes.apiProjectMembers(projectId), { cache: 'no-store' })
    const body = (await res.json().catch(() => ({}))) as {
      items?: TeamRow[]
      error?: string
    }
    if (!res.ok) {
      setError(body.error || `Load failed (${res.status})`)
      return
    }
    setItems(body.items ?? [])
    setError(null)
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, platformProjectId])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(paths.routes.apiProjectMembers(projectId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed, role: 'member' }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        if (body.error === 'user_not_found' || body.error === 'wrong_company') {
          throw new Error(t('projects.teamUserMissing'))
        }
        throw new Error(body.error || `Add failed (${res.status})`)
      }
      setEmail('')
      setStatus(t('projects.teamAdded'))
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setBusy(false)
    }
  }

  async function onInviteLink() {
    setBusy(true)
    setError(null)
    setInviteUrl(null)
    try {
      const res = await fetch(paths.routes.apiProjectInvites(projectId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'member' }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        inviteUrl?: string
        error?: string
      }
      if (!res.ok) throw new Error(body.error || `Invite failed (${res.status})`)
      const url = body.inviteUrl ?? ''
      setInviteUrl(url)
      if (url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setStatus(t('projects.teamInviteCopied'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setBusy(false)
    }
  }

  async function onRemove(userId: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiProjectMember(projectId, userId), {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `Remove failed (${res.status})`)
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  if (!bound) {
    return (
      <Panel className="checkion-project-team">
        <SectionChrome title={t('projects.teamTitle')} meta="—" as="h3" />
        <EmptyState>{t('projects.teamNeedsCollection')}</EmptyState>
      </Panel>
    )
  }

  return (
    <Panel className="checkion-project-team">
      <SectionChrome title={t('projects.teamTitle')} meta={`${items.length}`} as="h3" />
      {items.length === 0 ? (
        <EmptyState>{t('projects.teamEmpty')}</EmptyState>
      ) : (
        <ul className="checkion-issue-list">
          {items.map((m) => (
            <li key={m.id} className="checkion-index-card">
              <div className="checkion-index-card__meta">
                <Text role="meta">{m.role}</Text>
                <Text role="meta">{m.status}</Text>
              </div>
              <strong>{m.email}</strong>
              {m.status !== 'owner' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onRemove(m.id)}
                >
                  {t('projects.teamRemove')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form className="checkion-project-team__add" onSubmit={(e) => void onAdd(e)}>
        <Field label={t('projects.teamAddLabel')}>
          <Input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="name@company.com"
            disabled={busy}
          />
        </Field>
        <div className="checkion-scan-form__actions">
          <Button type="submit" size="sm" variant="primary" disabled={busy || !email.trim()}>
            {t('projects.teamAdd')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void onInviteLink()}
          >
            {t('projects.teamInviteLink')}
          </Button>
        </div>
      </form>
      {error ? (
        <Text role="meta" as="p">
          {error}
        </Text>
      ) : null}
      {status ? (
        <Text role="meta" as="p">
          {status}
        </Text>
      ) : null}
      {inviteUrl ? (
        <Text role="meta" as="p">
          <a href={inviteUrl}>{inviteUrl}</a>
        </Text>
      ) : null}
    </Panel>
  )
}
