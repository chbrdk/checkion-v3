import { NextResponse } from 'next/server'
import { paths } from '../../../../lib/paths'
import { plexonBaseUrl } from '../../../../lib/runtime-config'

/** Federation health — always reports dummy/deferred while local product work is primary. */
export async function GET() {
  return NextResponse.json({
    contract: paths.federationContract,
    plexonReachable: false,
    version: '0.1.0-dummy',
    mode: 'dummy',
    dataSource: paths.dataSource,
    plexonBase: plexonBaseUrl(),
    configured: false,
    deferred: true,
    note:
      'Plexon federation deferred — local fixtures for projects, scans, domain, GEO. Re-enable via specs/domain/plexon-federation.md later.',
  })
}
