import { GeoIndexPage } from '../../components/geo-index-page'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default function GeoPage() {
  return <GeoIndexPage />
}
