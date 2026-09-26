import { redirect } from 'next/navigation'
import { paths } from '../../../lib/paths'
import { auth } from '../../../auth'
import { listProjectsForViewer } from '../../../lib/fixtures/project-store'

export const dynamic = 'force-dynamic'

/** Legacy global `/seo` → project SEO workspace or projects hub. */
export default async function SeoRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; domain?: string; chapter?: string }>
}) {
  const q = await searchParams
  if (q.projectId?.trim()) {
    redirect(paths.routes.projectSeo(q.projectId.trim()))
  }
  const session = await auth()
  const projects = await listProjectsForViewer(session?.user?.id ?? null)
  if (projects.length === 1) {
    redirect(paths.routes.projectSeo(projects[0]!.id))
  }
  redirect(paths.routes.projects)
}
