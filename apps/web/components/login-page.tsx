'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button, Field, Hint, Input, Panel, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { getPlexonForgotPasswordUrl, getPlexonRegisterPageUrl } from '../lib/plexon-links'
import { useT } from '../lib/user-prefs'

function LoginForm({ plexonConfigured }: { plexonConfigured: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useT()
  const redirectTo = searchParams.get('redirect') || paths.routes.home
  const registerUrl = getPlexonRegisterPageUrl()
  const forgotUrl = getPlexonForgotPasswordUrl()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plexonConfigured) return
    setLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: redirectTo,
      })
      if (result?.error) throw new Error(t('errors.invalidCredentials'))
      if (result?.ok) {
        router.replace(redirectTo)
        router.refresh()
        return
      }
      throw new Error(t('errors.signInFailed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.signInFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!plexonConfigured) {
    return (
      <Panel>
        <SectionChrome title={t('login.title')} meta={paths.brandLabel} />
        <Hint panel>{t('login.unconfigured')}</Hint>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
          <Link href={paths.routes.home}>
            <Button>{t('login.continueApp')}</Button>
          </Link>
          <Link href={paths.routes.settings}>
            <Button variant="ghost">{t('nav.settings')}</Button>
          </Link>
        </div>
      </Panel>
    )
  }

  return (
    <Panel>
      <SectionChrome title={t('login.title')} meta={paths.brandLabel} />
      <Text role="body">{t('login.body')}</Text>
      {error ? (
        <p role="alert" style={{ color: 'var(--msqdx-danger, #c00)', marginTop: '0.75rem' }}>
          {error}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
        <Field label={t('login.email')} size="md">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            block
            aria-label={t('login.email')}
          />
        </Field>
        <Field label={t('login.password')} size="md">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            block
            aria-label={t('login.password')}
          />
        </Field>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
      <p style={{ marginTop: '0.75rem' }}>
        {registerUrl ? (
          <a href={registerUrl} className="checkion-link">
            {t('login.createAccount')}
          </a>
        ) : null}
        {registerUrl && forgotUrl ? <span aria-hidden> · </span> : null}
        {forgotUrl ? (
          <a href={forgotUrl} className="checkion-link">
            {t('login.forgotPassword')}
          </a>
        ) : null}
      </p>
    </Panel>
  )
}

export function LoginPageClient({ plexonConfigured }: { plexonConfigured: boolean }) {
  const t = useT()
  return (
    <Suspense
      fallback={
        <Panel>
          <SectionChrome title={t('login.title')} meta={paths.brandLabel} />
        </Panel>
      }
    >
      <LoginForm plexonConfigured={plexonConfigured} />
    </Suspense>
  )
}
