# Settings — CHECKION v3

**Status:** Accepted — Wave 4 / Phase 4 · **SET-L1** · **2026-08-28 SettingsShell** · **2026-08-29 polish + accent**  
**Route:** `/settings`  
**Knowledge:** `knowledge/paths.md`, `knowledge/settings-api-tokens.md`, `knowledge/i18n.md`  
**Reference:** `@msqdx/ui` `SettingsShell` · Plexon `themePreference` / `accentPreference` / `locale`

## Goal

Dense 2-col `SettingsShell`: Account, Profile, Appearance (theme + accent), Language, extras (API tokens, federation). No MUI. No stacked Panel chrome. Minimal help copy.

## Cross-app prefs

Hydrate/PATCH `locale` + `themePreference` + `accentPreference` via Plexon service profile when authenticated. Local cache for first paint.

## Locale (SET-L1)

WHEN the author changes Language in Settings, CHECKION SHALL store `paths.localeStorageKey` (`en` | `de`), set `document.documentElement.lang`, and PATCH Plexon when authenticated.  
WHEN locale is `de` or `en`, shell chrome, page leads, settings, hubs (home / projects / scan), jobs, and magazine chrome SHALL render via `t(key)` dictionaries (`apps/web/locales/{en,de}.json`) through `useUserPrefs().t`.  
Help tips remain bilingual via `help-tips.ts` (already locale-aware).  
Default locale is `en`. No URL/`[locale]` routing or next-intl.

## Composition

| Band | Treatment |
|------|-----------|
| Account | When authenticated: Plexon name/email (read) + Sign out. When unauthenticated: Sign in → `/login` |
| Profile | `Avatar` + display name `Input` (localStorage via `paths.displayNameStorageKey`); may seed from session name |
| Appearance | Theme + AccentSwatchGroup → Plexon |
| Language | Locale `ToggleGroup` (`en` / `de`) — SET-L1 + Plexon |
| API tokens | Personal Bearer CRUD — extras slot |
| Federation | Contract id, mode, plexon base, health — extras slot |

## Shell

- Rail footer avatar → `paths.routes.settings`, active on `/settings*`
- Initials from display name prefs (not a hardcoded brand string)
- Topbar has no duplicate settings gear (rail is the entry)
- Rail labels via `t('nav.*')`

## Auth

Login `/login` — plexon-v3 credentials when `PLEXON_AUTH_URL` + secret set; local open mode otherwise. Login chrome via `t('login.*')`.

## Non-goals

- Admin prompts / providers hub (AUDION-only)
- Password change / platform profile PATCH (Plexon control-plane ownership)
- Avatar file upload
- Translating scan/crawl payload (URLs, issue messages from axe, GEO distillate German product copy)

## Acceptance

1. Prefs survive reload via `paths.*StorageKey`.
2. Theme applies to `<html data-theme>`.
3. Settings rail entry enabled; avatar reflects display name.
4. Authenticated session shows Account + Sign out; unauthenticated shows Sign in → `/login`.
5. Tokens band remains create / list / revoke with one-time secret reveal.
6. UI smoke covers Account, Profile, Theme, Language, Tokens headings.
7. Language `de` switches rail + settings chrome to German; `en` restores English.
8. `en.json` / `de.json` key trees stay in parity (test).
