import { NextResponse } from 'next/server'
import { listIssueAffectedPages } from '../../../../../../../lib/domain-issue-pages'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; issueId: string }> },
) {
  const { id, issueId } = await context.params
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '25')
  const sortParam = url.searchParams.get('sort')
  const sort = sortParam === 'issues-asc' ? 'issues-asc' : 'issues-desc'
  const minIssues = Number(url.searchParams.get('minIssues') ?? '0')
  const maxRaw = url.searchParams.get('maxIssues')
  const maxIssues =
    maxRaw == null || maxRaw === '' || maxRaw === 'null' ? null : Number(maxRaw)

  const result = listIssueAffectedPages(id, issueId, {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25,
    sort,
    minIssues: Number.isFinite(minIssues) ? minIssues : 0,
    maxIssues: maxIssues != null && Number.isFinite(maxIssues) ? maxIssues : null,
  })
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(result)
}
