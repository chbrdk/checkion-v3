import { redirect } from 'next/navigation'
import { paths } from '../../../lib/paths'

export default async function ResultIndexRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(paths.routes.resultSection(id, 'overview'))
}
