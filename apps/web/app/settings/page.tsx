import { AppShell } from '../../components/app-shell'
import { SettingsPage } from '../../components/settings-page'
import { auth } from '../../auth'
import { listApiTokensForOwner, toApiTokenOwnerId } from '../../lib/api-tokens'
import { paths } from '../../lib/paths'
import { getFederationMode, plexonBaseUrl } from '../../lib/runtime-config'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function SettingsRoutePage() {
  const session = await auth()
  const { items: tokens } = await listApiTokensForOwner(toApiTokenOwnerId(session?.user))

  return (
    <AppShell title="Settings" description="Profile, appearance, API tokens, and federation.">
      <SettingsPage
        initialTokens={tokens}
        plexonBase={plexonBaseUrl()}
        federationMode={getFederationMode()}
        dataSource={paths.dataSource}
      />
    </AppShell>
  )
}
