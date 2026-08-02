import { NextResponse } from 'next/server'
import { paths } from '../../../../lib/paths'
import {
  getFederationMode,
  isPlexonFederationConfigured,
  plexonBaseUrl,
} from '../../../../lib/runtime-config'
import { probePlexonReachable } from '../../../../lib/plexon-project-origin'

/** Federation health — probes plexon when mode=live and configured. */
export async function GET() {
  const mode = getFederationMode()
  const configured = isPlexonFederationConfigured()
  const live = mode === 'live' && configured
  const plexonReachable = live ? await probePlexonReachable() : mode === 'dummy'

  return NextResponse.json({
    contract: paths.federationContract,
    plexonReachable,
    version: live ? '0.1.0' : '0.1.0-dummy',
    mode,
    dataSource: paths.dataSource,
    plexonBase: plexonBaseUrl(),
    configured,
    deferred: !live,
    note: live
      ? 'Live Plexon federation enabled.'
      : 'Fixture / dummy mode — set CHECKION_FEDERATION_MODE=live with PLEXON_SERVICE_SECRET to enable.',
  })
}
