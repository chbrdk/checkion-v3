import { NextResponse } from 'next/server'
import { z } from 'zod'
import { controlDomainScan } from '../../../../../lib/fixtures/scan-store'

const bodySchema = z.object({
  action: z.enum(['pause', 'resume', 'cancel']),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const result = await controlDomainScan(id, body.action)
    if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ success: true, status: result.status, message: result.message })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'control_failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
