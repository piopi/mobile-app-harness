# Accounts and gates

**Status:** template. Sign-in, onboarding, terms and holds work end to end locally.

## Capabilities

- Sign in with Apple, Google or an emailed 6-digit code (one flow: a first code creates the account). Dev builds use local stand-ins for Apple and Google; codes land in the stack's Mailpit.
- Onboarding in two steps (profile: a display name and an EXAMPLE optional "about you" field; then the terms and an optional marketing consent), saved in one `complete_onboarding` call. Projects add fields and steps with the recipe in the db-change skill.
- Account gates from `launch_status()`: signed out, onboarding, terms re-accept, suspended (a hold), member.
- Profile (Me): appearance (System / Light / Dark; the default is configured), sign out with the branded dialog.
- Roles: `staff` and `admin` grants, read on every call; JWT claims as UI hints.

## What admins can customise

- The terms (`publish_terms_version`): everyone re-accepts the new version, with "what changed".
- The contact email on hold screens (`update_app_settings`).
- Roles (`grant_role`, `revoke_role`) and account status (`set_member_status`).

## Where it lives

`supabase/migrations/20260101000000_foundation.sql`, `apps/mobile/src/app/(auth)`, `(onboarding)`, `suspended.tsx`, `src/lib/session.ts`, `src/features/auth`, `src/features/onboarding`, `packages/shared/src/auth.ts`, `rpc.ts`, `terms.ts`.

## Ideas to expand

- An admin UI for the RPCs above.
- Account deletion (a store requirement before release).
- More hold states (a duplicate account, a partner role) as new `launch_status` modes.
