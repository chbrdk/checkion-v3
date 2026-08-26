import { redirect } from 'next/navigation'
import { paths } from '../../lib/paths'

/** Results index dropped — singles live on Home / Projects / `/results/:id/…`. */
export default function ResultsIndexPage() {
  redirect(paths.routes.home)
}
