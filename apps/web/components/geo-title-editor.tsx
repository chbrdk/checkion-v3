'use client'

import { paths } from '../lib/paths'
import { JobTitleEditor } from './job-title-editor'

export function GeoTitleEditor({
  jobId,
  title,
  variant = 'cover',
}: {
  jobId: string
  title: string
  variant?: 'cover' | 'folio'
}) {
  return (
    <JobTitleEditor
      title={title}
      endpoint={paths.routes.apiGeoJobDetail(jobId)}
      dialogTitle="Rename GEO run"
      renameAriaLabel="Rename GEO job"
      renameTitle="Rename this GEO run"
      fieldAriaLabel="GEO job name"
      variant={variant}
    />
  )
}
