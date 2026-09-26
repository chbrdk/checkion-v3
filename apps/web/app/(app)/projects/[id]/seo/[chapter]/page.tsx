import { notFound } from 'next/navigation'
import { SeoProjectWorkspace } from '../../../../../../components/seo-project-workspace'
import { PageLead } from '../../../../../../components/page-lead'
import { auth } from '../../../../../../auth'
import { getProject } from '../../../../../../lib/fixtures/project-store'
import { viewerCanAccessProject } from '../../../../../../lib/project-access'
import type { SeoProjectChapter } from '../../../../../../lib/paths'

export const dynamic = 'force-dynamic'

const CHAPTERS: SeoProjectChapter[] = [
  'keywords',
  'domain',
  'backlinks',
  'rank-tracking',
  'competitors',
  'gsc',
]

export default async function ProjectSeoChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapter: string }>
}) {
  const { id, chapter: raw } = await params
  const session = await auth()
  const project = await getProject(id)
  if (!project || !(await viewerCanAccessProject(project, session?.user?.id ?? null))) {
    notFound()
  }
  const chapter = (CHAPTERS.includes(raw as SeoProjectChapter)
    ? raw
    : 'keywords') as SeoProjectChapter
  return (
    <>
      <PageLead description={`SEO · ${chapter} · ${project.name}`} />
      <SeoProjectWorkspace
        projectId={project.id}
        projectName={project.name}
        domain={project.domain}
        chapter={chapter}
      />
    </>
  )
}
