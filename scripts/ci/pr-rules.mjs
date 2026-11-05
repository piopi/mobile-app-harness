import { readFileSync } from 'node:fs';

// The rules a pull request must meet before review (docs/release.md), as pure functions; scripts/ci/check-pr-body.mjs applies
// them in CI (.github/workflows/pr-body.yml) and its tests cover them.

export const REQUIRED_SECTIONS = ['Summary', 'Delight', 'Tests'];

/** The PR title types (Conventional Commits). The squash commit takes the PR title, so main's history follows. */
export const TITLE_TYPES = ['feat', 'fix', 'chore', 'docs', 'refactor', 'perf', 'test', 'build', 'ci', 'style', 'revert'];

/** The package a user-facing changeset bumps (apps/mobile/package.json `name`): its version is the store version users see. */
export const APP_PACKAGE = JSON.parse(readFileSync(new URL('../../apps/mobile/package.json', import.meta.url), 'utf8')).name;

/** What a PR author writes in the Changeset section when nothing a user sees changes. */
export const NO_CHANGESET = 'No user-facing change';

/** The text of a `## <title>` section, without template comments and empty bullets ("" when absent). */
export function sectionText(markdown, title) {
  const text = markdown.replace(/\r\n/g, '\n');
  const match = text.match(new RegExp(`^## ${title}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  if (!match) return '';
  return match[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*-\s*$/gm, '')
    .trim();
}

export function emptySections(markdown, required = REQUIRED_SECTIONS) {
  return required.filter((title) => sectionText(markdown, title).length === 0);
}

/** Whether a title reads `type: summary` or `type(scope)!: summary`. */
export function isConventionalTitle(title) {
  return new RegExp(`^(${TITLE_TYPES.join('|')})(\\([\\w./ -]+\\))?!?: \\S`).test(title.trim());
}

/** Release PRs (main → production) and the Changesets "Version packages" PR carry no template. */
export function isReleasePr({ base, head }) {
  return base === 'production' || head.startsWith('changeset-release/');
}

/**
 * Why the PR's changeset is missing or wrong, or null when it's fine.
 * @param {{ body: string, files: Array<{ filename: string, status: string, patch?: string }> }} pr
 */
export function changesetProblem({ body, files }) {
  const added = files.filter((f) => /^\.changeset\/[^/]+\.md$/.test(f.filename) && f.filename !== '.changeset/README.md' && f.status !== 'removed');
  if (added.length > 0) {
    // The patch of a new file is its content: the front matter must name the app.
    const namesApp = added.some((f) => f.patch === undefined || f.patch.includes(APP_PACKAGE));
    return namesApp ? null : `The changeset must bump "${APP_PACKAGE}" (the app's version is the one users see).`;
  }
  if (new RegExp(NO_CHANGESET, 'i').test(sectionText(body, 'Changeset'))) return null;
  return `Add a changeset (\`pnpm changeset\`, pick ${APP_PACKAGE}, write what users notice), or write "${NO_CHANGESET}" in the Changeset section.`;
}
