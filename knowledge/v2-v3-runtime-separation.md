# V2 ↔ V3 runtime separation — CHECKION

| | CHECKION (v2) | checkion-v3 |
|--|---------------|-------------|
| Repo | `CHECKION` | `checkion-v3` |
| DS | MUI + `@msqdx/react` | `@msqdx/ui` only |
| Federation | Prod Plexon | plexon-v3 |
| DB | Prod Postgres | Own / fixtures first — **no share** |
| Coolify | Prod | msqdx-v3-staging island |

Prod freeze: no cutover until island MVP accepted.
