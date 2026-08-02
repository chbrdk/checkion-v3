/** Env-only helper — safe to import without pulling in `pg`. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

/** Alias for audion-style naming in store facades. */
export function isProjectsDatabaseConfigured(): boolean {
  return isDatabaseConfigured()
}
