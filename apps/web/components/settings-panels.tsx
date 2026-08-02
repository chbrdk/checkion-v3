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

export function SettingsTokens({ tokens }: { tokens: ApiTokenStub[] }) {
  return (
    <Panel>
      <SectionChrome title="API tokens" meta="stub" />
      <Text role="meta">
        Personal tokens for MCP/CLI later. Prefix {paths.apiTokenPrefix}. Create/revoke arrives with
        auth.
      </Text>
      {tokens.length === 0 ? (
        <Text role="meta">No tokens.</Text>
      ) : (
        <ul className="checkion-issue-list">
          {tokens.map((token) => (
            <li key={token.id}>
              <strong>{token.label}</strong> · {token.prefix}…
              {token.lastUsedAt ? ` · used ${token.lastUsedAt.slice(0, 10)}` : ''}
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: '0.75rem' }}>
        <Button type="button" size="sm" disabled>
          Create token
        </Button>
      </div>
    </Panel>
  )
}
