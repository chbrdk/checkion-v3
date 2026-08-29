'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  AccentSwatchGroup,
  Avatar,
  Button,
  Field,
  Input,
  resolveAccentOption,
  SettingsBand,
  SettingsShell,
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
  const { displayName, setDisplayName, theme, setTheme, accent, setAccent, locale, setLocale, t } =
    useUserPrefs()
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
  const avatarSrc = session?.user?.image ?? undefined
  const accentOption = resolveAccentOption(accent)

  return (
    <SettingsShell
      className="checkion-settings"
      labels={{
        account: t('settings.account'),
        profile: t('settings.profile'),
        appearance: t('settings.appearance'),
        language: t('settings.language'),
      }}
      account={
        status === 'authenticated' && accountEmail ? (
          <>
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
          <p className="checkion-settings-account-link">
            <Link href={paths.routes.login} className="checkion-link">
              {t('common.signIn')}
            </Link>
          </p>
        ) : null
      }
      profile={
        <div className="ds-settings-profile-row checkion-settings-profile-row">
          <Avatar
            name={draft.trim() || displayName}
            src={avatarSrc}
            size="lg"
            accent={accentOption.preview}
            accentContrast={accentOption.textColor}
          />
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
      appearance={
        <div className="ds-settings-appearance-stack">
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
          <AccentSwatchGroup
            value={accent}
            onChange={setAccent}
            aria-label={t('settings.appearance')}
          />
        </div>
      }
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
