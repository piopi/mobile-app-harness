import { describe, expect, it } from 'vitest';
import { APP_PACKAGE, changesetProblem, emptySections, isConventionalTitle, isReleasePr } from './pr-rules.mjs';

describe('isConventionalTitle', () => {
  it.each(['feat: offline edits', 'fix(items): the count', 'chore(release)!: drop Node 20', 'docs: release flow'])('accepts %s', (t) => {
    expect(isConventionalTitle(t)).toBe(true);
  });
  it.each(['Profile pictures: add, show everywhere', 'feat:missing space', 'feature: nope', 'fix(): empty scope', 'Version Packages'])('rejects %s', (t) => {
    expect(isConventionalTitle(t)).toBe(false);
  });
});

describe('isReleasePr', () => {
  it('spots main → production and the Version packages PR', () => {
    expect(isReleasePr({ base: 'production', head: 'main' })).toBe(true);
    expect(isReleasePr({ base: 'main', head: 'changeset-release/main' })).toBe(true);
    expect(isReleasePr({ base: 'main', head: 'feat/x' })).toBe(false);
  });
});

describe('emptySections', () => {
  it('treats a template comment or an empty bullet as empty', () => {
    const body = '## Summary\n\n<!-- hi -->\n-\n\n## Delight\n\nNot user-facing\n\n## Tests\n\n- Unit: plan.test.mjs\n';
    expect(emptySections(body)).toEqual(['Summary']);
  });
});

describe('changesetProblem', () => {
  const changeset = (patch) => ({ filename: '.changeset/brave-dogs-run.md', status: 'added', patch });
  const code = { filename: 'apps/mobile/src/app/index.tsx', status: 'modified' };

  it('passes a PR with a changeset for the app', () => {
    expect(changesetProblem({ body: '', files: [code, changeset(`+---\n+"${APP_PACKAGE}": minor\n+---\n+Offline edits.`)] })).toBeNull();
  });
  it('fails a changeset that bumps only an internal package', () => {
    expect(changesetProblem({ body: '', files: [changeset('+---\n+"@scope/ui": patch\n+---\n+x')] })).toMatch(`must bump "${APP_PACKAGE}"`);
  });
  it('passes "No user-facing change" in the Changeset section', () => {
    expect(changesetProblem({ body: '## Changeset\n\n<!-- … -->\nNo user-facing change: harness only.\n\n## Tests\n', files: [code] })).toBeNull();
  });
  it('fails a PR with neither', () => {
    expect(changesetProblem({ body: '## Changeset\n\n<!-- No user-facing change -->\n', files: [code] })).toMatch(/Add a changeset/);
  });
  it('ignores the folder’s config and a deleted changeset', () => {
    const files = [
      { filename: '.changeset/config.json', status: 'modified' },
      { ...changeset('-x'), status: 'removed' },
    ];
    expect(changesetProblem({ body: '', files })).toMatch(/Add a changeset/);
  });
});
