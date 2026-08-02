# Scan migration map (v2 → v3)

| v2 concept | v3 |
|------------|-----|
| Single scan page | `/scan` + `/results/[id]/…` |
| Deep / domain mega page | Light `/domain/[id]/overview\|issues\|detail` |
| Mode tabs (Journey/GEO/…) | Deferred; hint on launch form |
| Heavy JSON hydrate | Overview + issues + scores endpoints (Detail UI reads overview snapshots) |
