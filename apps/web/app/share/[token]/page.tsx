import { notFound } from 'next/navigation'
import { Panel, SectionChrome, Text } from '@msqdx/ui'
import { DomainOverviewPanel } from '../../../components/domain-overview-panel'
import { ResultOverviewPanel } from '../../../components/result-panels'
import { getShare } from '../../../lib/fixtures/share-store'
import { getDomainOverview, getScanOverview } from '../../../lib/fixtures/scan-store'
import { paths } from '../../../lib/paths'

export default async function ShareLandingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const share = await getShare(token)
  if (!share) notFound()

  if (share.resourceType === 'single') {
    const overview = await getScanOverview(share.resourceId)
    if (!overview) notFound()
    return (
      <main className="checkion-share-landing">
        <header className="checkion-share-landing__head">
          <p className="checkion-share-brand">{paths.brandLabel}</p>
          <Text role="meta">Shared scan result · read only</Text>
        </header>
        <ResultOverviewPanel overview={overview} />
        <Panel>
          <SectionChrome title="About this link" quiet />
          <Text role="meta">
            Minimal public share — password protection and journey shares come later.
          </Text>
        </Panel>
      </main>
    )
  }

  const overview = await getDomainOverview(share.resourceId)
  if (!overview) notFound()

  return (
    <main className="checkion-share-landing">
      <header className="checkion-share-landing__head">
        <p className="checkion-share-brand">{paths.brandLabel}</p>
        <Text role="meta">Shared domain crawl · read only</Text>
      </header>
      <DomainOverviewPanel overview={overview} />
      <Panel>
        <SectionChrome title="About this link" quiet />
        <Text role="meta">
          Minimal public share — password protection and journey shares come later.
        </Text>
      </Panel>
    </main>
  )
}
