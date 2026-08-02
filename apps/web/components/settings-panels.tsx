'use client'

import { useEffect, useState } from 'react'
import { Button, Field, Panel, SectionChrome, Text } from '@msqdx/ui'
import { Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import type { ApiTokenStub } from '@checkion-v3/contracts'

export function SettingsAppearance() {
  const [theme, setTheme] = useState<string>(paths.defaultTheme)
  const [locale, setLocale] = useState<string>(paths.defaultLocale)

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(paths.themeStorageKey)
    const storedLocale = window.localStorage.getItem(paths.localeStorageKey)
    if (storedTheme && (paths.themeChoices as readonly string[]).includes(storedTheme)) {
      setTheme(storedTheme)
    }
    if (storedLocale && (paths.localeChoices as readonly string[]).includes(storedLocale)) {
      setLocale(storedLocale)
    }
  }, [])

  function applyTheme(next: string) {
    setTheme(next)
    window.localStorage.setItem(paths.themeStorageKey, next)
    document.documentElement.setAttribute('data-theme', next)
  }

  function applyLocale(next: string) {
    setLocale(next)
    window.localStorage.setItem(paths.localeStorageKey, next)
  }

  return (
    <Panel>
      <SectionChrome title="Appearance" />
      <div className="checkion-scan-form">
        <Field label="Theme">
          <Select
            value={theme}
            onChange={applyTheme}
            options={paths.themeChoices.map((t) => ({ value: t, label: t }))}
          />
        </Field>
        <Field label="Locale">
          <Select
            value={locale}
            onChange={applyLocale}
            options={paths.localeChoices.map((l) => ({ value: l, label: l }))}
          />
        </Field>
      </div>
    </Panel>
  )
}

export function SettingsTokens({ tokens: initialTokens }: { tokens: ApiTokenStub[] }) {
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
        setError('Create failed')
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
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiTokenDetail(tokenId), { method: 'DELETE' })
      if (!res.ok) {
        setError('Revoke failed')
        return
      }
      if (rawSecret) setRawSecret(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <SectionChrome title="API tokens" meta={paths.apiTokenPrefix} />
      <Text role="meta">
        Personal Bearer tokens for MCP/CLI. Raw secret shown once on create; only the hash is stored.
        Use <code>Authorization: Bearer checkion_…</code> on selected APIs (
        <code>POST /api/scans</code>, <code>POST /api/geo-jobs</code>, <code>POST /api/projects</code>).
      </Text>
      {tokens.length === 0 ? (
        <Text role="meta">No tokens.</Text>
      ) : (
        <ul className="checkion-issue-list">
          {tokens.map((token) => (
            <li key={token.id}>
              <strong>{token.label}</strong> · {token.prefix}…
              {token.lastUsedAt ? ` · used ${token.lastUsedAt.slice(0, 10)}` : ''}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void revokeToken(token.id)}
                style={{ marginLeft: '0.5rem' }}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
      {rawSecret ? (
        <Text role="meta" data-testid="settings-token-secret">
          Copy now — will not be shown again: <code>{rawSecret}</code>
        </Text>
      ) : null}
      {error ? <Text role="meta">{error}</Text> : null}
      <div className="checkion-scan-form" style={{ marginTop: '0.75rem' }}>
        <Field label="Label">
          <input
            data-testid="settings-token-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Local CLI"
          />
        </Field>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          data-testid="settings-token-create"
          onClick={() => void createToken()}
        >
          Create token
        </Button>
      </div>
    </Panel>
  )
}
