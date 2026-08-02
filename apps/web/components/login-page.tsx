'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button, Field, Hint, Input, Panel, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { getPlexonForgotPasswordUrl, getPlexonRegisterPageUrl } from '../lib/plexon-links'

function LoginForm({ plexonConfigured }: { plexonConfigured: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
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
      if (result?.error) throw new Error('Invalid email or password')
      if (result?.ok) {
        router.replace(redirectTo)
        router.refresh()
        return
      }
      throw new Error('Sign in failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  if (!plexonConfigured) {
    return (
      <Panel>
        <SectionChrome title="Sign in" meta={paths.brandLabel} />
        <Hint panel>
          Plexon auth is not configured. Set `PLEXON_AUTH_URL` and `PLEXON_SERVICE_SECRET` to enable
          login. Fixture mode stays open without authentication.
        </Hint>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
          <Link href={paths.routes.home}>
            <Button>Continue to app</Button>
          </Link>
          <Link href={paths.routes.settings}>
            <Button variant="ghost">Settings</Button>
          </Link>
        </div>
      </Panel>
    )
  }

  return (
    <Panel>
      <SectionChrome title="Sign in" meta={paths.brandLabel} />
      <Text role="body">Use your Plexon account. Identity lives on the platform control plane.</Text>
      {error ? (
        <p role="alert" style={{ color: 'var(--msqdx-danger, #c00)', marginTop: '0.75rem' }}>
          {error}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
        <Field label="Email" size="md">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            block
            aria-label="Email"
          />
        </Field>
        <Field label="Password" size="md">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            block
            aria-label="Password"
          />
        </Field>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p style={{ marginTop: '0.75rem' }}>
        {registerUrl ? (
          <a href={registerUrl} className="checkion-link">
            Create account
          </a>
        ) : null}
        {registerUrl && forgotUrl ? <span aria-hidden> · </span> : null}
        {forgotUrl ? (
          <a href={forgotUrl} className="checkion-link">
            Forgot password
          </a>
        ) : null}
      </p>
    </Panel>
  )
}

export function LoginPageClient({ plexonConfigured }: { plexonConfigured: boolean }) {
  return (
    <Suspense
      fallback={
        <Panel>
          <SectionChrome title="Sign in" meta={paths.brandLabel} />
        </Panel>
      }
    >
      <LoginForm plexonConfigured={plexonConfigured} />
    </Suspense>
  )
}
