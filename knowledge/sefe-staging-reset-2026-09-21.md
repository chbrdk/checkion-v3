# SEFE staging reset (2026-09-21)

## CHECKION
All Checkion projects with name matching `sefe` (case-insensitive) were archived via
`DELETE /api/projects/:id` (soft-archive + Plexon Collection lifecycle). Active SEFE rows: **0**.

## Plexon
Collection archive is driven by Checkion DELETE (`setCollectionLifecycleOnPlexon`). Direct
`PATCH /api/platform/projects/:id` with service secret alone returns 401 (actor required) —
prefer product DELETE/archive routes.

## AUDION
Postgres has no public port on this Coolify host (`is_public` stays without `public_port`),
so SEFE Audion mirrors could not be SQL-archived from outside. After persona-binding fix
redeploy, create a fresh Collection via EQC; archive leftover Audion SEFE rows in the UI if
they still appear in hubs.

## Persona binding fix
See `knowledge/target-group-project-id-alias.md` (AUDION) and Plexon
`lib/integrations/audion-persona-bootstrap-client.ts` (send `projectId` + `project_id`).
