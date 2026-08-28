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
  SettingsBand,
  SettingsShell,
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
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
    auto: t('settings.themeAuto'),
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
    <SettingsShell
      className="checkion-settings"
      labels={{
        account: t('settings.account'),
        profile: t('settings.profile'),
        appearance: t('settings.appearance'),
        language: t('settings.language'),
      }}
      lede={<Hint panel>{t('settings.hint')}</Hint>}
      account={
        status === 'authenticated' && accountEmail ? (
          <>
            <Text role="body" className="checkion-settings-help">
              {t('settings.accountSignedIn')}
            </Text>
            <dl className="ds-settings-account-dl checkion-settings-account">
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
          </>
        ) : status !== 'loading' ? (
          <>
            <Text role="body" className="checkion-settings-help">
              {t('settings.accountSignedOut')}
            </Text>
            <p className="checkion-settings-account-link">
              <Link href={paths.routes.login} className="checkion-link">
                {t('common.signIn')}
              </Link>
            </p>
          </>
        ) : null
      }
      profile={
        <div className="ds-settings-profile-row checkion-settings-profile-row">
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
      }
      appearanceHelp={t('settings.appearanceHelp')}
      appearance={
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
      }
      languageHelp={t('settings.languageHelp')}
      language={
        <ToggleGroup
          aria-label={t('settings.language')}
          value={locale}
          onChange={(next) => setLocale(next as UiLocaleId)}
          options={paths.localeChoices.map((id) => ({
            value: id,
            label: localeLabels[id],
          }))}
        />
      }
      extras={
        <>
          <SettingsTokens tokens={initialTokens} />
          <SettingsBand
            title={t('settings.federation')}
            help={t('settings.federationHelp', { contract: paths.federationContract })}
            data-testid="settings-federation"
          >
            <dl className="ds-settings-account-dl checkion-settings-account">
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
          </SettingsBand>
        </>
      }
    />
  )
}
