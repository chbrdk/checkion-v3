# Settings — CHECKION v3

**Status:** Accepted — Wave 4 / Phase 4 · UI aligned to Audion/Plexon settings composition · **SET-L1 locale chrome**  
**Route:** `/settings`  
**Knowledge:** `knowledge/paths.md`, `knowledge/settings-api-tokens.md`, `knowledge/i18n.md`  
**Reference:** audion-v3 `SettingsPage` · plexon-v3 `/settings` bands · brandion-v3 SET-L1 · `@msqdx/ui` SectionChrome / ToggleGroup / Avatar

## Goal

Quiet settings page matching the shared product pattern: Account, Profile, Appearance, Language, plus CHECKION-specific API tokens and federation status. No MUI. No stacked Panel chrome.

## Locale (SET-L1)

WHEN the author changes Language in Settings, CHECKION SHALL store `paths.localeStorageKey` (`en` | `de`) and set `document.documentElement.lang`.  
WHEN locale is `de` or `en`, shell chrome, page leads, settings, hubs (home / projects / scan), jobs, and magazine chrome SHALL render via `t(key)` dictionaries (`apps/web/locales/{en,de}.json`) through `useUserPrefs().t`.  
Help tips remain bilingual via `help-tips.ts` (already locale-aware).  
Default locale is `en`. No URL/`[locale]` routing or next-intl.

## Composition

| Band | Treatment |
|------|-----------|
| Account | When authenticated: Plexon name/email (read) + Sign out. When unauthenticated: Sign in → `/login` |
| Profile | `Avatar` + display name `Input` (localStorage via `paths.displayNameStorageKey`); may seed from session name |
| Appearance | Theme `ToggleGroup` → `data-theme` + `paths.themeStorageKey` |
| Language | Locale `ToggleGroup` (`en` / `de`) — drives UI chrome + help tips |
| API tokens | Personal Bearer CRUD (`specs/domain/settings-api-tokens.md`) — create once / revoke |
| Federation | Contract id, mode, plexon base, health probe link (read-only ops band) |

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
- Brand accent color selector (Plexon-only)
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
