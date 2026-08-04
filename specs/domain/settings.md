# Settings — CHECKION v3

**Status:** Accepted — Wave 4 / Phase 4 · UI aligned to Audion/Plexon settings composition  
**Route:** `/settings`  
**Knowledge:** `knowledge/paths.md`, `knowledge/settings-api-tokens.md`  
**Reference:** audion-v3 `SettingsPage` · plexon-v3 `/settings` bands · `@msqdx/ui` SectionChrome / ToggleGroup / Avatar

## Goal

Quiet settings page matching the shared product pattern: Account, Profile, Appearance, Language, plus CHECKION-specific API tokens and federation status. No MUI. No stacked Panel chrome.

## Composition

| Band | Treatment |
|------|-----------|
| Account | When authenticated: Plexon name/email (read) + Sign out. When unauthenticated: Sign in → `/login` |
| Profile | `Avatar` + display name `Input` (localStorage via `paths.displayNameStorageKey`); may seed from session name |
| Appearance | Theme `ToggleGroup` → `data-theme` + `paths.themeStorageKey` |
| Language | Locale `ToggleGroup` (`en` / `de`) — drives bilingual **help tip** copy; UI chrome stays English |
| API tokens | Personal Bearer CRUD (`specs/domain/settings-api-tokens.md`) — create once / revoke |
| Federation | Contract id, mode, plexon base, health probe link (read-only ops band) |

## Shell

- Rail footer avatar → `paths.routes.settings`, active on `/settings*`
- Initials from display name prefs (not a hardcoded brand string)
- Topbar has no duplicate settings gear (rail is the entry)

## Auth

Login `/login` — plexon-v3 credentials when `PLEXON_AUTH_URL` + secret set; local open mode otherwise.

## Non-goals

- Admin prompts / providers hub (AUDION-only)
- Password change / platform profile PATCH (Plexon control-plane ownership)
- Brand accent color selector (Plexon-only)

## Acceptance

1. Prefs survive reload via `paths.*StorageKey`.
2. Theme applies to `<html data-theme>`.
3. Settings rail entry enabled; avatar reflects display name.
4. Authenticated session shows Account + Sign out; unauthenticated shows Sign in → `/login`.
5. Tokens band remains create / list / revoke with one-time secret reveal.
6. UI smoke covers Account, Profile, Theme, Language, Tokens headings.
