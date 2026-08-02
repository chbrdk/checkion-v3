import { LoginPageClient } from '../../components/login-page'
import { isPlexonAuthConfigured } from '../../lib/plexon-auth'

/** Runtime Plexon auth flags — must not SSG with build-time blanked secrets. */
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="checkion-share-landing">
      <LoginPageClient plexonConfigured={isPlexonAuthConfigured()} />
    </main>
  )
}
