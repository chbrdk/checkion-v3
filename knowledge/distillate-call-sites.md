# Destillat Call-Sites — CHECKION

**Spec:** `plexon-v3/specs/domain/suite-enterprise-program.md` § E1 / E4  
**Clients:** `apps/web/lib/plexon-suite-audit.ts` · `apps/web/lib/plexon-collection-activity.ts`

| Trigger | File | Activity | Audit | Notes |
|---|---|---|---|---|
| GEO job completed | `apps/web/lib/db/geo-jobs.ts` | `scheduleCollectionActivityDistillate` | `scheduleSuiteAuditEvent` | kind `geo_job` · action `run_finished` |
| Overview Freigabe | `apps/web/app/api/projects/[id]/client-room/publish/route.ts` | — | — | ClientRoom slot (+ Share-Links Hub); no distillate |
| Public share create | `apps/web/app/api/share/route.ts` | — | — | Share-Links Hub only |
