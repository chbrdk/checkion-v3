import { NextResponse } from 'next/server'
import type { UpdateProjectInput } from '@checkion-v3/contracts'
import {
  deleteProject,
  getProject,
  updateProject,
} from '../../../../lib/fixtures/project-store'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const project = await getProject(id)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  let body: UpdateProjectInput
  try {
    body = (await request.json()) as UpdateProjectInput
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const project = await updateProject(id, body)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const ok = await deleteProject(id)
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
