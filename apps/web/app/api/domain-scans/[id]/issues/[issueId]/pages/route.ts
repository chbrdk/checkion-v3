import { NextResponse } from 'next/server'
import { listIssueAffectedPages } from '../../../../../../../lib/domain-issue-pages'
import { viewerCanAccessDomainScan } from '../../../../../../../lib/resource-access'
import {
  forbiddenResponse,
  resolveApiViewerId,
} from '../../../../../../../lib/resource-access-http'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; issueId: string }> },
) {
  const viewer = await resolveApiViewerId(request)
  if (!viewer.ok) return viewer.response
  const { id, issueId } = await context.params
  if (!(await viewerCanAccessDomainScan(id, viewer.viewerId))) return forbiddenResponse()

  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '25')
  const sortParam = url.searchParams.get('sort')
  const sort = sortParam === 'issues-asc' ? 'issues-asc' : 'issues-desc'
  const minIssues = Number(url.searchParams.get('minIssues') ?? '0')
  const maxRaw = url.searchParams.get('maxIssues')
  const maxIssues =
    maxRaw == null || maxRaw === '' || maxRaw === 'null' ? null : Number(maxRaw)

  const result = await listIssueAffectedPages(id, issueId, {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25,
    sort,
    minIssues: Number.isFinite(minIssues) ? minIssues : 0,
    maxIssues: maxIssues != null && Number.isFinite(maxIssues) ? maxIssues : null,
  })
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(result)
}
