import Link from 'next/link'
import { Button, Panel, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../../lib/paths'

export default function LoginPage() {
  return (
    <main className="checkion-share-landing">
      <Panel>
        <SectionChrome title="Sign in" meta={paths.brandLabel} />
        <Text role="body">
          Auth against plexon-v3 will land here. For local MVP, continue without a session.
        </Text>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
          <Link href={paths.routes.home}>
            <Button>Continue locally</Button>
          </Link>
          <Link href={paths.routes.settings}>
            <Button variant="ghost">Settings</Button>
          </Link>
        </div>
      </Panel>
    </main>
  )
}
