import { describe, expect, it } from 'vitest'

describe('GET /api/projects/:id/geo-history', () => {
  it('returns soft-match series for demo project', async () => {
    const { GET } = await import('../app/api/projects/[id]/geo-history/route')
    const res = await GET(
      new Request('http://localhost/api/projects/proj-demo-1/geo-history?measurement=recall'),
      { params: Promise.resolve({ id: 'proj-demo-1' }) },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      projectId: string
      items: Array<{ points: unknown[]; queryKey: string }>
    }
    expect(body.projectId).toBe('proj-demo-1')
    expect(body.items.some((i) => i.points.length >= 2)).toBe(true)
  })

  it('returns 404 for unknown projects', async () => {
    const { GET } = await import('../app/api/projects/[id]/geo-history/route')
    const res = await GET(new Request('http://localhost/api/projects/missing/geo-history'), {
      params: Promise.resolve({ id: 'missing-project' }),
    })
    expect(res.status).toBe(404)
  })
})
