import { notFound } from 'next/navigation'
import { SeoProjectWorkspace } from '../../../../../components/seo-project-workspace'
import { PageLead } from '../../../../../components/page-lead'
import { auth } from '../../../../../auth'
import { getProject } from '../../../../../lib/fixtures/project-store'
import { viewerCanAccessProject } from '../../../../../lib/project-access'
import type { SeoProjectChapter } from '../../../../../lib/paths'

export const dynamic = 'force-dynamic'

export default async function ProjectSeoOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const project = await getProject(id)
  if (!project || !(await viewerCanAccessProject(project, session?.user?.id ?? null))) {
    notFound()
  }
  const chapter: SeoProjectChapter = 'overview'
  return (
    <>
      <PageLead description={`SEO · ${project.name}`} />
      <SeoProjectWorkspace
        projectId={project.id}
        projectName={project.name}
        domain={project.domain}
        chapter={chapter}
      />
    </>
  )
}
