# Changesets

A pull request a user notices adds one: `pnpm changeset`, pick the app package (`apps/mobile`), `patch` for a fix or `minor` for a feature, and one sentence a user would understand. It becomes the CHANGELOG line, the GitHub release notes and the OTA update message. Everything else writes "No user-facing change" in the PR's **Changeset** section. The flow: [docs/release.md](../docs/release.md).
