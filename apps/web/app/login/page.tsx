import { LoginPageClient } from '../../components/login-page'
import { isPlexonAuthConfigured } from '../../lib/plexon-auth'

export default function LoginPage() {
  return (
    <main className="checkion-share-landing">
      <LoginPageClient plexonConfigured={isPlexonAuthConfigured()} />
    </main>
  )
}
