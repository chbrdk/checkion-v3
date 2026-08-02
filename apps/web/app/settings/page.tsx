import Link from 'next/link'
import { Button, Panel, SectionChrome, Text } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { SettingsAppearance, SettingsTokens } from '../../components/settings-panels'
import { listApiTokens } from '../../lib/fixtures/api-tokens-store'
import { paths } from '../../lib/paths'
import { plexonBaseUrl } from '../../lib/runtime-config'

export default function SettingsPage() {
  const tokens = listApiTokens()

  return (
    <AppShell title="Settings" description="Local fixture mode — projects, scans, domain, GEO.">
      <div className="checkion-magazine">
        <Panel>
          <SectionChrome title="Data source" meta={paths.dataSource} />
          <dl className="checkion-meta-grid">
            <div>
              <dt>Mode</dt>
              <dd>{paths.federationMode}</dd>
            </div>
            <div>
              <dt>Federation</dt>
              <dd>deferred</dd>
            </div>
            <div>
              <dt>Plexon base (parked)</dt>
              <dd>{plexonBaseUrl()}</dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd>
                <Link href={paths.routes.apiFederationHealth}>{paths.routes.apiFederationHealth}</Link>
              </dd>
            </div>
          </dl>
          <Text role="meta">
            Everything you see is fixture data. Create projects, launch single/domain scans, and
            explore GEO locally — no live Plexon sync while federation is deferred.
          </Text>
          <div style={{ marginTop: '0.75rem' }}>
            <Link href={paths.routes.login}>
              <Button size="sm" variant="ghost">
                Login stub
              </Button>
            </Link>
          </div>
        </Panel>

        <SettingsAppearance />
        <SettingsTokens tokens={tokens} />
      </div>
    </AppShell>
  )
}
