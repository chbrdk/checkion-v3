'use client'

import { useState } from 'react'
import { Button, Field, Input, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import type { ApiTokenStub } from '@checkion-v3/contracts'

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
    if (!window.confirm('Revoke this API token? Scripts using it will stop working.')) return
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

  function handleCopySecret() {
    if (!rawSecret) return
    void navigator.clipboard.writeText(rawSecret)
  }

  return (
    <section className="checkion-settings-section" data-testid="settings-tokens">
      <SectionChrome quiet title="API tokens" as="h2" />
      <Text role="body" className="checkion-settings-help">
        Personal Bearer tokens for MCP/CLI. Raw secret shown once on create; only the hash is stored.
        Use <code>Authorization: Bearer {paths.apiTokenPrefix}…</code> on selected APIs (
        <code>POST /api/scans</code>, <code>POST /api/geo-jobs</code>, <code>POST /api/projects</code>).
      </Text>

      {rawSecret ? (
        <div className="checkion-settings-token-reveal">
          <Text role="title">Copy your token now</Text>
          <code className="checkion-settings-token-code" data-testid="settings-token-secret">
            {rawSecret}
          </code>
          <Text role="hint">This value will not be shown again.</Text>
          <div className="checkion-settings-actions">
            <Button type="button" variant="ghost" size="sm" onClick={handleCopySecret}>
              Copy
            </Button>
            <Button type="button" variant="link" size="sm" onClick={() => setRawSecret(null)}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="checkion-settings-token-create">
          <Field label="Label" size="sm">
            <Input
              data-testid="settings-token-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Local CLI"
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
            {busy ? 'Creating…' : 'Create token'}
          </Button>
        </div>
      )}

      <Text role="label">Your tokens</Text>
      {tokens.length === 0 ? (
        <Text role="meta">No tokens yet.</Text>
      ) : (
        <ul className="checkion-settings-token-list">
          {tokens.map((token) => (
            <li key={token.id} className="checkion-settings-token-row">
              <div>
                <Text role="body">{token.label}</Text>
                <Text role="meta">
                  {token.prefix}…
                  {token.lastUsedAt ? ` · used ${token.lastUsedAt.slice(0, 10)}` : ''}
                </Text>
              </div>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => void revokeToken(token.id)}
              >
                Revoke
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
