import { NextResponse } from 'next/server'
import { listDomainScans } from '../../../lib/fixtures/scan-store'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId') ?? undefined
  return NextResponse.json({ items: listDomainScans(projectId) })
}
