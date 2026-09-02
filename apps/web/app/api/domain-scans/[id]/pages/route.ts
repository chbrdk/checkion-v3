import { NextResponse } from 'next/server'
import type { DomainCorpusPagesSort } from '@checkion-v3/contracts'
import { listDomainCorpusPages } from '../../../../../lib/domain-corpus-pages'

const SORT_VALUES: DomainCorpusPagesSort[] = [
  'score_asc',
  'score_desc',
  'url_asc',
  'issues_desc',
]

function parseSort(raw: string | null): DomainCorpusPagesSort | null {
  if (raw == null || raw === '') return 'score_asc'
  return SORT_VALUES.includes(raw as DomainCorpusPagesSort)
    ? (raw as DomainCorpusPagesSort)
    : null
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '25')
  const sort = parseSort(url.searchParams.get('sort'))
  const q = url.searchParams.get('q') ?? undefined

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: 'invalid_page' }, { status: 400 })
  }
  if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json({ error: 'invalid_page_size' }, { status: 400 })
  }
  if (sort == null) {
    return NextResponse.json({ error: 'invalid_sort' }, { status: 400 })
  }

  const result = await listDomainCorpusPages(id, { page, pageSize, sort, q })
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { corpusMode, ...body } = result
  const headers = new Headers()
  headers.set('X-Checkion-Corpus-Mode', corpusMode)
  return NextResponse.json(body, { headers })
}
