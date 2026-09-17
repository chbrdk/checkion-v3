import { describe, expect, it } from 'vitest'
import { GET } from '../app/api/geo-jobs/[id]/export/route'
import { GEO_CSV_COLUMNS } from '../lib/geo-csv-export'

describe('GET /api/geo-jobs/:id/export', () => {
  it('returns CSV attachment for a fixture geo job', async () => {
    const res = await GET(new Request('http://localhost/api/geo-jobs/geo-1/export'), {
      params: Promise.resolve({ id: 'geo-1' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="checkion-geo-geo-1.csv"',
    )
    const bytes = new Uint8Array(await res.arrayBuffer())
    // UTF-8 BOM is present on the wire (Excel); Response.text() strips U+FEFF.
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder().decode(bytes)
    const header = text.split('\r\n')[0]
    expect(header).toBe(GEO_CSV_COLUMNS.join(','))
    expect(text).toContain('geo-1')
    expect(text).toContain('answer_text')
  })

  it('returns 404 for unknown jobs', async () => {
    const res = await GET(new Request('http://localhost/api/geo-jobs/missing/export'), {
      params: Promise.resolve({ id: 'missing-geo-job' }),
    })
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'not_found' })
  })
})
