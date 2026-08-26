'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Avatar,
  Button,
  Field,
  Hint,
  Input,
  SectionChrome,
  Text,
  ToggleGroup,
} from '@msqdx/ui'
import { SettingsTokens } from './settings-panels'
import { paths } from '../lib/paths'
import { useUserPrefs, type UiLocaleId, type UiThemeId } from '../lib/user-prefs'
import type { ApiTokenStub } from '@checkion-v3/contracts'

export function SettingsPage({
  initialTokens,
  plexonBase,
  federationMode,
  dataSource,
}: {
  initialTokens: ApiTokenStub[]
  plexonBase: string
  federationMode: string
  dataSource: string
}) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { displayName, setDisplayName, theme, setTheme, locale, setLocale, t } = useUserPrefs()
  const [draft, setDraft] = useState(displayName)
  const [loggingOut, setLoggingOut] = useState(false)

  const themeLabels: Record<UiThemeId, string> = {
    msqdx: t('settings.themeLight'),
    'msqdx-dark': t('settings.themeDark'),
    'msqdx-v2': t('settings.themeV2Light'),
    'msqdx-v2-dark': t('settings.themeV2Dark'),
  }

  const localeLabels: Record<UiLocaleId, string> = {
    en: t('settings.english'),
    de: t('settings.deutsch'),
  }

  useEffect(() => {
    setDraft(displayName)
  }, [displayName])

  useEffect(() => {
    const sessionName = session?.user?.name?.trim()
    if (status !== 'authenticated' || !sessionName) return
    if (displayName === paths.defaultDisplayName || !displayName.trim()) {
      setDisplayName(sessionName)
      setDraft(sessionName)
    }
  }, [status, session?.user?.name, displayName, setDisplayName])

  function commitName() {
    setDisplayName(draft)
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut({ redirect: false })
      router.replace(paths.routes.login)
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  const accountEmail = session?.user?.email ?? null
  const accountName = session?.user?.name ?? null

  return (
    <div className="checkion-settings">
      <Hint panel>{t('settings.hint')}</Hint>

      {status === 'authenticated' && accountEmail ? (
        <section className="checkion-settings-section">
          <SectionChrome quiet title={t('settings.account')} as="h2" />
          <Text role="body" className="checkion-settings-help">
            {t('settings.accountSignedIn')}
          </Text>
          <dl className="checkion-settings-account">
            {accountName ? (
              <>
                <dt>{t('settings.name')}</dt>
                <dd>{accountName}</dd>
              </>
            ) : null}
            <dt>{t('settings.email')}</dt>
            <dd>{accountEmail}</dd>
          </dl>
          <Button type="button" variant="subtle" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? t('common.signingOut') : t('common.signOut')}
          </Button>
        </section>
      ) : status !== 'loading' ? (
        <section className="checkion-settings-section">
          <SectionChrome quiet title={t('settings.account')} as="h2" />
          <Text role="body" className="checkion-settings-help">
            {t('settings.accountSignedOut')}
          </Text>
          <p className="checkion-settings-account-link">
            <Link href={paths.routes.login} className="checkion-link">
              {t('common.signIn')}
            </Link>
          </p>
        </section>
      ) : null}

      <section className="checkion-settings-section">
        <SectionChrome quiet title={t('settings.profile')} as="h2" />
        <div className="checkion-settings-profile-row">
          <Avatar name={draft.trim() || displayName} size="lg" />
          <Field label={t('settings.displayName')} size="sm">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitName()
                }
              }}
              aria-label={t('settings.displayName')}
              maxLength={40}
              block
            />
          </Field>
        </div>
      </section>

      <section className="checkion-settings-section">
        <SectionChrome quiet title={t('settings.appearance')} as="h2" />
        <Text role="body" className="checkion-settings-help">
          {t('settings.appearanceHelp')}
        </Text>
        <ToggleGroup
          className="theme-toggle"
          aria-label={t('settings.theme')}
          value={theme}
          onChange={(next) => setTheme(next as UiThemeId)}
          options={paths.themeChoices.map((id) => ({
            value: id,
            label: themeLabels[id],
          }))}
        />
      </section>

      <section className="checkion-settings-section">
        <SectionChrome quiet title={t('settings.language')} as="h2" />
        <Text role="body" className="checkion-settings-help">
          {t('settings.languageHelp')}
        </Text>
        <ToggleGroup
          aria-label={t('settings.language')}
          value={locale}
          onChange={(next) => setLocale(next as UiLocaleId)}
          options={paths.localeChoices.map((id) => ({
            value: id,
            label: localeLabels[id],
          }))}
        />
      </section>

      <SettingsTokens tokens={initialTokens} />

      <section className="checkion-settings-section" data-testid="settings-federation">
        <SectionChrome quiet title={t('settings.federation')} as="h2" />
        <Text role="body" className="checkion-settings-help">
          {t('settings.federationHelp', { contract: paths.federationContract })}
        </Text>
        <dl className="checkion-settings-account">
          <dt>{t('settings.dataSource')}</dt>
          <dd>{dataSource}</dd>
          <dt>{t('settings.mode')}</dt>
          <dd>{federationMode}</dd>
          <dt>{t('settings.plexonBase')}</dt>
          <dd>{plexonBase}</dd>
          <dt>{t('settings.health')}</dt>
          <dd>
            <Link href={paths.routes.apiFederationHealth} className="checkion-link">
              {paths.routes.apiFederationHealth}
            </Link>
          </dd>
        </dl>
      </section>
    </div>
  )
}
