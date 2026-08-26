'use client'

import { useState } from 'react'
import { Button, Field, Input, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import type { ApiTokenStub } from '@checkion-v3/contracts'

export function SettingsTokens({ tokens: initialTokens }: { tokens: ApiTokenStub[] }) {
  const t = useT()
  const [tokens, setTokens] = useState(initialTokens)
  const [label, setLabel] = useState('')
  const [rawSecret, setRawSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const res = await fetch(paths.routes.apiTokens)
    if (!res.ok) return
    const body = (await res.json()) as { items?: ApiTokenStub[] }
    setTokens(body.items ?? [])
  }

  async function createToken() {
    setBusy(true)
    setError(null)
    setRawSecret(null)
    try {
      const res = await fetch(paths.routes.apiTokens, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || undefined }),
      })
      if (!res.ok) {
        setError(t('errors.createFailed'))
        return
      }
      const created = (await res.json()) as ApiTokenStub & { token: string }
      setRawSecret(created.token)
      setLabel('')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function revokeToken(tokenId: string) {
    if (!window.confirm(t('settings.tokensRevokeConfirm'))) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiTokenDetail(tokenId), { method: 'DELETE' })
      if (!res.ok) {
        setError(t('errors.revokeFailed'))
        return
      }
      if (rawSecret) setRawSecret(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  function handleCopySecret() {
    if (!rawSecret) return
    void navigator.clipboard.writeText(rawSecret)
  }

  return (
    <section className="checkion-settings-section" data-testid="settings-tokens">
      <SectionChrome quiet title={t('settings.tokensTitle')} as="h2" />
      <Text role="body" className="checkion-settings-help">
        {t('settings.tokensHelp')}{' '}
        <code>Authorization: Bearer {paths.apiTokenPrefix}…</code> (
        <code>POST /api/scans</code>, <code>POST /api/geo-jobs</code>, <code>POST /api/projects</code>
        ).
      </Text>

      {rawSecret ? (
        <div className="checkion-settings-token-reveal">
          <Text role="title">{t('settings.tokensCopyNow')}</Text>
          <code className="checkion-settings-token-code" data-testid="settings-token-secret">
            {rawSecret}
          </code>
          <Text role="hint">{t('settings.tokensNotShownAgain')}</Text>
          <div className="checkion-settings-actions">
            <Button type="button" variant="ghost" size="sm" onClick={handleCopySecret}>
              {t('common.copy')}
            </Button>
            <Button type="button" variant="link" size="sm" onClick={() => setRawSecret(null)}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="checkion-settings-token-create">
          <Field label={t('settings.tokensLabel')} size="sm">
            <Input
              data-testid="settings-token-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('settings.tokensLabelPlaceholder')}
              block
            />
          </Field>
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            data-testid="settings-token-create"
            onClick={() => void createToken()}
          >
            {busy ? t('settings.tokensCreating') : t('settings.tokensCreate')}
          </Button>
        </div>
      )}

      <Text role="label">{t('settings.tokensYours')}</Text>
      {tokens.length === 0 ? (
        <Text role="meta">{t('settings.tokensEmpty')}</Text>
      ) : (
        <ul className="checkion-settings-token-list">
          {tokens.map((token) => (
            <li key={token.id} className="checkion-settings-token-row">
              <div>
                <Text role="body">{token.label}</Text>
                <Text role="meta">
                  {token.prefix}…
                  {token.lastUsedAt
                    ? ` · ${t('settings.tokensUsed', { date: token.lastUsedAt.slice(0, 10) })}`
                    : ''}
                </Text>
              </div>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => void revokeToken(token.id)}
              >
                {t('settings.tokensRevoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <Text role="meta" data-testid="settings-token-error">
          {error}
        </Text>
      ) : null}
    </section>
  )
}
