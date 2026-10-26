# Acme

PROJECT: one line on what the app is. This file is the project's vocabulary: every domain word, what it means, and the words to avoid. Agents use these words in code, copy and PRs. Grow it with the domain-modeling skill as the domain takes shape.

## Roles

**Member**:
A person with an account who has finished onboarding.
_Avoid_: User, customer

**Staff**:
A member with the staff role: sees drafts and staff-only tools.
_Avoid_: Moderator, operator

**Admin**:
A member with the admin role: changes project data (settings, terms, items, roles) through admin RPCs.
_Avoid_: Owner, superuser

## Account

**Account gate**:
The one screen group the app opens for an account state (`launch_status().mode`): signed out, onboarding, terms, suspended or member.

**Terms**:
The versioned terms of use every member accepts; an admin publishes a new version and everyone accepts it again.
_Avoid_: Waiver, EULA (unless the project's lawyers say so)

**Hold**:
A gate with nothing to do but read and sign out (a suspended account).

## Harness

**Slot**:
A numbered set of local resources (Metro port, simulator, emulator port, Supabase stack) one worktree owns while it works.

**Scenario**:
A named database state (`pnpm seed <name>`) layered on the base seed, with the account to sign in as.

**Agent event**:
A dev-only deep link (`<scheme>://__agent/<event>`) that flips a client-only state for tests and screenshots.

<!-- PROJECT:domain -->
## Domain

PROJECT: the domain words, as the first features name them.
<!-- /PROJECT -->
