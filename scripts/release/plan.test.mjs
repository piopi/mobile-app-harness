import { describe, expect, it } from 'vitest';
import {
  appCommands,
  decide,
  deployableFunctions,
  matchingBuild,
  migrationVersions,
  missingOnStaging,
  parseMigrationList,
  releasePlatforms,
  releaseNotes,
  supabaseDeployCommands,
  tagCommand,
  updateMessage,
} from './plan.mjs';

// What `changeset version` writes (default changelog).
const CHANGELOG = `# @app/mobile

## 0.2.0

### Minor Changes

- f0ca2f7: Reminders now arrive two hours before the event.

### Patch Changes

- f0ca2f7: Fix the item count after an offline edit.

## 0.1.1

### Patch Changes

- 1a2b3c4: Older fix.
`;

const FP = { ios: 'a'.repeat(40), android: 'b'.repeat(40) };
const BUILT = [{ id: 'build-1', status: 'FINISHED' }];
const base = {
  version: '0.2.0',
  commit: 'c'.repeat(40),
  tagCommit: null,
  fingerprints: FP,
  builds: { ios: [], android: [] },
  notes: releaseNotes(CHANGELOG, '0.2.0'),
  ascAppId: '6741234567',
};

describe('releasePlatforms', () => {
  it('ships both platforms by default', () => {
    expect(releasePlatforms(undefined)).toEqual(['ios', 'android']);
    expect(releasePlatforms('')).toEqual(['ios', 'android']);
  });
  it('ships only the platforms listed (iOS until Google Play exists)', () => {
    expect(releasePlatforms('ios')).toEqual(['ios']);
    expect(releasePlatforms(' android , ios ')).toEqual(['ios', 'android']);
  });
  it('refuses an unknown platform', () => {
    expect(() => releasePlatforms('ios,web')).toThrow(/web/);
  });
});

describe('releaseNotes', () => {
  it('returns the version’s section only', () => {
    const notes = releaseNotes(CHANGELOG, '0.2.0');
    expect(notes).toContain('Reminders now');
    expect(notes).toContain('Fix the item count');
    expect(notes).not.toContain('Older fix');
  });
  it('is null for a version Changesets never wrote', () => {
    expect(releaseNotes(CHANGELOG, '9.9.9')).toBeNull();
    expect(releaseNotes('', '0.1.0')).toBeNull();
  });
});

describe('updateMessage', () => {
  it('joins the summaries without commit prefixes', () => {
    expect(updateMessage(base.notes, '0.2.0')).toBe(
      'v0.2.0: Reminders now arrive two hours before the event.; Fix the item count after an offline edit.',
    );
  });
  it('falls back to the version, and stays short', () => {
    expect(updateMessage(null, '0.2.0')).toBe('v0.2.0');
    expect(updateMessage(`- ${'x'.repeat(500)}`, '0.2.0', 50)).toHaveLength(50);
  });
});

describe('matchingBuild', () => {
  it('counts finished and running builds, not failed or cancelled ones', () => {
    expect(
      matchingBuild([
        { id: 'x', status: 'ERRORED' },
        { id: 'y', status: 'IN_PROGRESS' },
      ]),
    ).toEqual({ id: 'y', status: 'IN_PROGRESS' });
    expect(matchingBuild([{ id: 'x', status: 'CANCELED' }])).toBeNull();
    expect(matchingBuild([])).toBeNull();
  });
  it('is undefined when EAS wasn’t asked', () => {
    expect(matchingBuild(undefined)).toBeUndefined();
    expect(matchingBuild(null)).toBeUndefined();
  });
});

describe('decide', () => {
  it('ships an OTA update when production builds already have both fingerprints', () => {
    const d = decide({ ...base, builds: { ios: BUILT, android: BUILT } });
    expect(d.action).toBe('release');
    expect(d.update).toEqual(['ios', 'android']);
    expect(d.build).toEqual([]);
    expect(d.blockers).toEqual([]);
    expect(appCommands(d)).toEqual([
      "eas update --channel production --environment production --platform all --message 'v0.2.0: Reminders now arrive two hours before the event.; Fix the item count after an offline edit.' --non-interactive",
    ]);
  });

  it('builds and submits both stores when the fingerprint changed', () => {
    const d = decide(base);
    expect(d.build).toEqual(['ios', 'android']);
    expect(appCommands(d)).toEqual(['eas build --profile production --platform all --non-interactive --auto-submit --no-wait']);
  });

  it('splits by platform: a build for one, an update for the other', () => {
    const d = decide({ ...base, builds: { ios: [], android: BUILT } });
    expect(appCommands(d)).toEqual([
      'eas build --profile production --platform ios --non-interactive --auto-submit --no-wait',
      expect.stringMatching(/^eas update --channel production --environment production --platform android /),
    ]);
  });

  it('assumes a store build when EAS couldn’t be asked, and says so', () => {
    const d = decide({ ...base, builds: { ios: undefined, android: undefined } });
    expect(d.build).toEqual(['ios', 'android']);
    expect(d.warnings.some((w) => w.includes('no EXPO_TOKEN'))).toBe(true);
    expect(d.platforms.ios.known).toBe(false);
  });

  it('refuses a version that was already released from another commit', () => {
    const d = decide({ ...base, tagCommit: 'd'.repeat(40) });
    expect(d.blockers[0]).toMatch(/v0\.2\.0 was already released/);
  });

  it('does nothing when the tag already points at this commit (a re-run)', () => {
    const d = decide({ ...base, tagCommit: base.commit });
    expect(d.action).toBe('nothing');
    expect(appCommands(d)).toEqual([]);
  });

  it('refuses an iOS store build without the App Store Connect app id, but not an update', () => {
    expect(decide({ ...base, ascAppId: undefined }).blockers[0]).toMatch(/ascAppId/);
    expect(decide({ ...base, ascAppId: undefined, builds: { ios: BUILT, android: [] } }).blockers).toEqual([]);
  });

  it('warns when the changelog has no section for the version', () => {
    const d = decide({ ...base, notes: null });
    expect(d.message).toBe('v0.2.0');
    expect(d.warnings[0]).toMatch(/no "## 0.2.0" section/);
  });

  it('quotes the message for the shell', () => {
    const d = decide({ ...base, notes: "- abc1234: Users' lists", builds: { ios: BUILT, android: BUILT } });
    expect(appCommands(d)[0]).toContain(`--message 'v0.2.0: Users'\\''`);
  });

  it('tags the released commit', () => {
    expect(tagCommand(decide(base))).toBe(`gh release create v0.2.0 --target ${base.commit} --title v0.2.0 --notes-file .wt/tmp/release-notes.md`);
  });
});

describe('staging migrations', () => {
  const v2 = `

   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260101000000 | 20260101000000 | 2026-01-01 00:00:00
   20260102000000 |                | 2026-01-02 00:00:00
                  | 20260103000000 | 2026-01-03 00:00:00
`;
  const boxed = `│ \`20260101000000\` │ \`20260101000000\` │ \`2026-01-01 00:00:00\` │
│ \`20260102000000\` │ \` \` │ \`2026-01-02 00:00:00\` │`;

  it('reads both columns of the CLI table', () => {
    const { local, remote } = parseMigrationList(v2);
    expect([...local]).toEqual(['20260101000000', '20260102000000']);
    expect([...remote]).toEqual(['20260101000000', '20260103000000']);
  });

  it('reads the box-drawn, backticked table too', () => {
    const { local, remote } = parseMigrationList(boxed);
    expect([...local]).toEqual(['20260101000000', '20260102000000']);
    expect([...remote]).toEqual(['20260101000000']);
  });

  it('lists what staging lacks, and ignores what staging has beyond the release', () => {
    const { remote } = parseMigrationList(v2);
    expect(missingOnStaging(['20260101000000', '20260102000000'], remote)).toEqual(['20260102000000']);
    expect(missingOnStaging(['20260101000000'], remote)).toEqual([]);
  });

  it('takes versions from migration file names', () => {
    expect(migrationVersions(['20260102000000_b.sql', 'README.md', '20260101000000_a.sql'])).toEqual(['20260101000000', '20260102000000']);
  });
});

describe('deploy', () => {
  it('never deploys shared code or the local fakes', () => {
    expect(deployableFunctions(['notify', '_shared', 'payments-fake', 'push-send', '.DS_Store'])).toEqual(['notify', 'push-send']);
  });
  it('links, pushes the migrations, then deploys the functions', () => {
    expect(supabaseDeployCommands(['notify', 'push-send'])).toEqual([
      'supabase link --project-ref "$SUPABASE_PROJECT_REF"',
      'supabase db push --linked',
      'supabase functions deploy notify push-send --project-ref "$SUPABASE_PROJECT_REF"',
    ]);
  });
  it('deploys no functions when there are none (a bare `functions deploy` would ship the local fakes)', () => {
    expect(supabaseDeployCommands([])).toEqual(['supabase link --project-ref "$SUPABASE_PROJECT_REF"', 'supabase db push --linked']);
  });
});
