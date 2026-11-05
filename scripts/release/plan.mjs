// The release decisions, as pure functions (docs/release.md): what a push to `production` ships and which commands do it.
// scripts/release.mjs gathers the inputs (version, changelog, fingerprints, EAS builds, staging's migrations) and
// runs or prints the commands; this file only decides, so its tests cover every branch without EAS or Supabase.

export const ALL_PLATFORMS = /** @type {const} */ (['ios', 'android']);

/**
 * The platforms a release ships: `RELEASE_PLATFORMS` (a GitHub repository variable, comma-separated), else both.
 * Set it to `ios` while the Google Play account doesn't exist yet.
 * @param {string | undefined} value
 */
export function releasePlatforms(value) {
  const list = (value ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (list.length === 0) return [...ALL_PLATFORMS];
  const bad = list.filter((p) => !ALL_PLATFORMS.includes(/** @type {any} */ (p)));
  if (bad.length > 0) throw new Error(`RELEASE_PLATFORMS: unknown platform ${bad.join(', ')} (use ios, android)`);
  return ALL_PLATFORMS.filter((p) => list.includes(p));
}

export const PLATFORMS = releasePlatforms(process.env.RELEASE_PLATFORMS);

/** Edge Functions that exist only for local development (local fakes of third-party APIs, named `<name>-fake`) never reach a hosted project. */
export const isLocalOnlyFunction = (name) => name.endsWith('-fake');

/** EAS statuses of a build that will (or did) produce a binary: an update for its fingerprint reaches it. */
const LIVE_BUILD_STATUSES = new Set(['new', 'in_queue', 'in_progress', 'pending_cancel', 'finished']);

/**
 * The CHANGELOG.md section Changesets wrote for `version` (without its heading), or null.
 * @param {string} changelog
 * @param {string} version
 */
export function releaseNotes(changelog, version) {
  const lines = changelog.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  const section = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
  return section.length > 0 ? section : null;
}

/**
 * The one-line `eas update --message`: the version, then each change's summary (Changesets' "- <sha>: " prefix
 * dropped), cut to fit the EAS dashboard.
 * @param {string | null} notes
 * @param {string} version
 */
export function updateMessage(notes, version, max = 300) {
  const items = (notes ?? '')
    .split('\n')
    .filter((l) => /^\s*[-*] /.test(l))
    .map((l) =>
      l
        .replace(/^\s*[-*] /, '')
        .replace(/^[0-9a-f]{7,40}: /, '')
        .trim(),
    )
    .filter(Boolean);
  const message = items.length > 0 ? `v${version}: ${items.join('; ')}` : `v${version}`;
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

/**
 * Whether a list of EAS builds (`eas build:list --json`) holds one that ships this fingerprint.
 * @param {Array<{ id: string, status: string }> | null | undefined} builds null/undefined: unknown (no EAS access)
 * @returns {{ id: string, status: string } | null | undefined}
 */
export function matchingBuild(builds) {
  if (builds == null) return undefined;
  return builds.find((b) => LIVE_BUILD_STATUSES.has(String(b.status).toLowerCase())) ?? null;
}

/**
 * What a release does, per platform: an over-the-air update when a production build already has this native
 * fingerprint, a store build (then TestFlight / Play internal testing) when none has.
 *
 * @param {object} input
 * @param {string} input.version          apps/mobile/package.json `version`
 * @param {string} input.commit           the commit being released
 * @param {string | null} input.tagCommit the commit `v<version>` already points at, or null
 * @param {Record<'ios'|'android', string>} input.fingerprints
 * @param {Record<'ios'|'android', Array<{id: string, status: string}> | null | undefined>} input.builds
 *   EAS production builds with that fingerprint; null/undefined when EAS couldn't be asked (dry run without EXPO_TOKEN)
 * @param {string | null} input.notes     the CHANGELOG.md section for this version
 * @param {string | undefined} input.ascAppId submit.production.ios.ascAppId in eas.json
 */
export function decide({ version, commit, tagCommit, fingerprints, builds, notes, ascAppId }) {
  const tag = `v${version}`;
  const blockers = [];
  const warnings = [];

  if (tagCommit && tagCommit !== commit) {
    blockers.push(
      `${tag} was already released from ${tagCommit.slice(0, 7)}. Merge the "Version packages" PR on main (it bumps the version), then merge main into production again.`,
    );
  }
  const alreadyReleased = tagCommit === commit;
  if (!notes) warnings.push(`apps/mobile/CHANGELOG.md has no "## ${version}" section: the update message is just "${tag}".`);

  /** @type {Record<string, { fingerprint: string, ship: 'update' | 'build', build: string | null, known: boolean }>} */
  const platforms = {};
  for (const p of PLATFORMS) {
    const match = matchingBuild(builds[p]);
    const known = match !== undefined;
    platforms[p] = { fingerprint: fingerprints[p], ship: match ? 'update' : 'build', build: match?.id ?? null, known };
    if (!known) warnings.push(`${p}: EAS wasn't asked (no EXPO_TOKEN), so this assumes no build has fingerprint ${fingerprints[p].slice(0, 12)}…`);
  }

  const build = PLATFORMS.filter((p) => platforms[p].ship === 'build');
  const update = PLATFORMS.filter((p) => platforms[p].ship === 'update');
  if (build.includes('ios') && !ascAppId) {
    blockers.push('eas.json has no submit.production.ios.ascAppId, so the iOS build can’t go to TestFlight (docs/release.md: App Store Connect).');
  }

  return {
    tag,
    version,
    commit,
    action: alreadyReleased ? 'nothing' : 'release',
    platforms,
    build,
    update,
    message: updateMessage(notes, version),
    blockers,
    warnings,
  };
}

/** `all` when both platforms take the same path, else the one platform. */
function platformArg(list) {
  return list.length === ALL_PLATFORMS.length ? 'all' : list[0];
}

/** Shell-quote one argument (single quotes). */
export function sq(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * The EAS and git commands that ship a decision, in order. EAS builds run on Expo's servers (`--no-wait`): the
 * GitHub runner only queues them, so no macOS minutes are spent.
 * @param {ReturnType<typeof decide>} d
 */
export function appCommands(d) {
  if (d.action !== 'release') return [];
  const cmds = [];
  if (d.build.length > 0) {
    cmds.push(`eas build --profile production --platform ${platformArg(d.build)} --non-interactive --auto-submit --no-wait`);
  }
  if (d.update.length > 0) {
    cmds.push(`eas update --channel production --environment production --platform ${platformArg(d.update)} --message ${sq(d.message)} --non-interactive`);
  }
  return cmds;
}

/** The release tag and its GitHub release, whose notes are the changelog section. */
export function tagCommand(d) {
  return `gh release create ${d.tag} --target ${d.commit} --title ${d.tag} --notes-file .wt/tmp/release-notes.md`;
}

/**
 * Migration versions from `supabase migration list` output (CLI 2.x table, `|` or box-drawing separators, cells
 * optionally in backticks): the Local and Remote columns.
 * @param {string} text
 */
export function parseMigrationList(text) {
  const local = new Set();
  const remote = new Set();
  for (const line of text.split('\n')) {
    const cells = line.split(/[|│┃]/).map((c) => c.replace(/`/g, '').trim());
    if (cells.length < 3) continue;
    const [l, r] = cells[0] === '' && cells.length > 3 ? cells.slice(1) : cells;
    if (/^\d{3,}$/.test(l)) local.add(l);
    if (/^\d{3,}$/.test(r)) remote.add(r);
  }
  return { local, remote };
}

/** The migration versions of supabase/migrations file names (`<version>_<name>.sql`). */
export function migrationVersions(fileNames) {
  return fileNames
    .map((f) => /^(\d+)_.*\.sql$/.exec(f)?.[1])
    .filter(Boolean)
    .sort();
}

/**
 * The release's migrations that staging hasn't applied. Staging may be ahead (main has newer ones): that's fine.
 * @param {string[]} releaseVersions
 * @param {Set<string>} stagingVersions
 */
export function missingOnStaging(releaseVersions, stagingVersions) {
  return releaseVersions.filter((v) => !stagingVersions.has(v));
}

/** The Edge Functions to deploy: every folder in supabase/functions except shared code (`_shared`) and local fakes. */
export function deployableFunctions(dirNames) {
  return dirNames.filter((d) => !d.startsWith('_') && !d.startsWith('.') && !isLocalOnlyFunction(d)).sort();
}

/**
 * The Supabase commands that deploy a backend (`staging` or `production`). The project ref, access token and
 * database password come from the workflow's secrets (`STAGING_*` or `PRODUCTION_*`).
 * @param {string[]} functions
 */
export function supabaseDeployCommands(functions) {
  const cmds = ['supabase link --project-ref "$SUPABASE_PROJECT_REF"', 'supabase db push --linked'];
  // With no names, `supabase functions deploy` deploys every folder, local fakes included: skip it when there are none.
  if (functions.length > 0) cmds.push(`supabase functions deploy ${functions.join(' ')} --project-ref "$SUPABASE_PROJECT_REF"`);
  return cmds;
}
