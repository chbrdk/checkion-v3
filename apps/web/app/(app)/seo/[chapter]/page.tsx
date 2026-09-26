import { redirect } from 'next/navigation'
import { paths, type SeoProjectChapter } from '../../../../lib/paths'
import { auth } from '../../../../auth'
import { listProjectsForViewer } from '../../../../lib/fixtures/project-store'

export const dynamic = 'force-dynamic'

const LEGACY_MAP: Record<string, SeoProjectChapter> = {
  keywords: 'keywords',
  serp: 'keywords',
  domain: 'domain',
  rank: 'rank-tracking',
  'rank-tracking': 'rank-tracking',
  competitors: 'competitors',
  backlinks: 'backlinks',
  gsc: 'gsc',
}

/** Legacy `/seo/:chapter` → `/projects/:id/seo/...`. */
export default async function SeoChapterRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapter: string }>
  searchParams: Promise<{ projectId?: string }>
}) {
  const { chapter: raw } = await params
  const q = await searchParams
  const chapter = LEGACY_MAP[raw] ?? 'overview'
  if (q.projectId?.trim()) {
    redirect(paths.routes.projectSeo(q.projectId.trim(), chapter))
  }
  const session = await auth()
  const projects = await listProjectsForViewer(session?.user?.id ?? null)
  if (projects.length === 1) {
    redirect(paths.routes.projectSeo(projects[0]!.id, chapter))
  }
  redirect(paths.routes.projects)
}
