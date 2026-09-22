import { NextResponse } from 'next/server'
import { paths } from '../../../lib/paths'
import { screenshotStorageProbe } from '../../../lib/scan/screenshot-storage'

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: 'checkion-v3',
    federationContract: paths.federationContract,
    screenshots: screenshotStorageProbe(),
  })
}
