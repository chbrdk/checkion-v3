'use client'

/**
 * Project team — Audion CompactEditableList parity:
 * numbered magazine rows, inline draft email (no fat Field), Invite link aside.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Button, EmptyState, Panel, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { isRealPlatformProjectId } from '../lib/plexon-platform-id'
import { useT } from '../lib/user-prefs'

type TeamRow = {
  id: string
  email: string
  role: string
  status: string
}

const DRAFT_ID = '__draft__'

export function ProjectTeamPanel({
  projectId,
  platformProjectId,
}: {
  projectId: string
  platformProjectId?: string | null
}) {
  const t = useT()
  const baseId = useId()
  const bound = isRealPlatformProjectId(platformProjectId)
  const [items, setItems] = useState<TeamRow[]>([])
  const [draftOpen, setDraftOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const skipBlurSave = useRef(false)

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

  useEffect(() => {
    if (!draftOpen) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [draftOpen])

  function beginDraft() {
    if (busy || draftOpen) return
    setDraftOpen(true)
    setDraft('')
    setError(null)
    setStatus(null)
  }

  function cancelDraft() {
    skipBlurSave.current = true
    setDraftOpen(false)
    setDraft('')
  }

  async function commitDraft() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraftOpen(false)
      setDraft('')
      return
    }
    if (busy) return
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
      setDraftOpen(false)
      setDraft('')
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
    if (busy || draftOpen) return
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
        <SectionChrome quiet title={t('projects.teamTitle')} meta="—" as="h3" />
        <EmptyState>{t('projects.teamNeedsCollection')}</EmptyState>
      </Panel>
    )
  }

  const nextNum = String(items.length + (draftOpen ? 1 : 0) + 1).padStart(2, '0')
  const showList = items.length > 0 || draftOpen

  return (
    <Panel className="checkion-project-team checkion-geo-query-list">
      <SectionChrome quiet title={t('projects.teamTitle')} meta={`${items.length}`} as="h3" />

      {showList ? (
        <ol className="checkion-magazine-list checkion-geo-query-list__items">
          {items.map((m, index) => (
            <li key={m.id} className="checkion-geo-query-list__row">
              <span className="checkion-magazine-list-num" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="checkion-geo-query-list__main checkion-project-team__main">
                <span className="checkion-project-team__email">{m.email}</span>
                <span className="checkion-project-team__meta">
                  {m.role} · {m.status}
                </span>
              </div>
              {m.status !== 'owner' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="checkion-geo-query-list__delete"
                  aria-label={t('projects.teamRemove')}
                  disabled={busy}
                  onClick={() => void onRemove(m.id)}
                >
                  ×
                </Button>
              ) : (
                <span aria-hidden />
              )}
            </li>
          ))}
          {draftOpen ? (
            <li className="checkion-geo-query-list__row">
              <span className="checkion-magazine-list-num" aria-hidden>
                {String(items.length + 1).padStart(2, '0')}
              </span>
              <div className="checkion-geo-query-list__main">
                <input
                  ref={inputRef}
                  id={`${baseId}-${DRAFT_ID}`}
                  className="checkion-geo-query-list__input"
                  type="email"
                  value={draft}
                  disabled={busy}
                  placeholder={t('projects.teamAddPlaceholder')}
                  aria-label={t('projects.teamAdd')}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    if (skipBlurSave.current) {
                      skipBlurSave.current = false
                      return
                    }
                    void commitDraft()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void commitDraft()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelDraft()
                    }
                  }}
                />
              </div>
            </li>
          ) : null}
        </ol>
      ) : (
        <EmptyState>{t('projects.teamEmpty')}</EmptyState>
      )}

      <div className="checkion-project-team__foot">
        <button
          type="button"
          className="checkion-geo-query-list__add"
          aria-label={t('projects.teamAdd')}
          disabled={busy || draftOpen}
          onClick={beginDraft}
        >
          <span className="checkion-magazine-list-num" aria-hidden>
            {nextNum}
          </span>
          <span className="checkion-geo-query-list__add-label">{t('projects.teamAdd')}</span>
        </button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="checkion-project-team__invite"
          disabled={busy}
          onClick={() => void onInviteLink()}
        >
          {t('projects.teamInviteLink')}
        </Button>
      </div>

      {error ? (
        <Text role="meta" as="p">
          {error}
        </Text>
      ) : null}
      {status ? (
        <p className="checkion-geo-query-list__paste-hint" role="status">
          {status}
        </p>
      ) : null}
      {inviteUrl ? (
        <Text role="meta" as="p">
          <a href={inviteUrl}>{inviteUrl}</a>
        </Text>
      ) : null}
    </Panel>
  )
}
