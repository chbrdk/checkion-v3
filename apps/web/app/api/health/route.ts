import { NextResponse } from 'next/server'
import { paths } from '../../../lib/paths'

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: 'checkion-v3',
    federationContract: paths.federationContract,
  })
}
