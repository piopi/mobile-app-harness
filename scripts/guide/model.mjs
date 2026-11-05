// How-to guides: one YAML file per guide in apps/mobile/.maestro/guides/<audience>/<slug>.yaml. A guide is a
// seed scenario, Maestro setup steps (off the page) and steps, each a caption with the Maestro steps that reach its
// screen. `pnpm guide build` turns each guide into Maestro flows, captures a screenshot (or a short clip) per step
// and renders the static site; `pnpm guide check` runs the flows without capturing. The how-to-guide skill has the format.
import { existsSync, globSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

/** Who a guide is for, in the order the site lists them. The id is the folder and the site's path. */
export const AUDIENCES = [
  { id: 'users', name: 'Using the app' },
  { id: 'admins', name: 'Admins' },
];
const AUDIENCE_IDS = AUDIENCES.map((a) => a.id);
/** `placeholder` copy still needs the human's yes; the site marks those pages Draft. */
const COPY_STATES = ['placeholder', 'approved'];
const GUIDE_KEYS = ['title', 'audience', 'summary', 'copy', 'scenario', 'order', 'open', 'covers', 'setup', 'steps'];
const STEP_KEYS = ['caption', 'alt', 'clip', 'do'];

export class GuideError extends Error {
  constructor(file, problems) {
    super(`${file}:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.file = file;
    this.problems = problems;
  }
}

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isCommandList = (v) => Array.isArray(v) && v.every((c) => (c && typeof c === 'object' && !Array.isArray(c)) || typeof c === 'string');

/**
 * Parse and check one guide. `file` is its path (for the slug, the folder's audience and error messages). Throws a
 * GuideError listing every problem, so a broken guide says all that's wrong at once.
 */
export function parseGuide(text, file) {
  const problems = [];
  let doc;
  try {
    doc = YAML.parse(text);
  } catch (e) {
    throw new GuideError(file, [`not valid YAML: ${e.message.split('\n')[0]}`]);
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new GuideError(file, ['a guide is a mapping with title, audience, scenario and steps']);

  const slug = path.basename(file).replace(/\.ya?ml$/, '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) problems.push(`file name "${slug}" must be kebab-case (it is the page's address)`);
  for (const k of Object.keys(doc)) if (!GUIDE_KEYS.includes(k)) problems.push(`unknown key "${k}" (known: ${GUIDE_KEYS.join(', ')})`);
  if (!isText(doc.title)) problems.push('title: required text');
  if (!AUDIENCE_IDS.includes(doc.audience)) problems.push(`audience: one of ${AUDIENCE_IDS.join(', ')}`);
  const folder = path.basename(path.dirname(file));
  if (AUDIENCE_IDS.includes(doc.audience) && AUDIENCE_IDS.includes(folder) && folder !== doc.audience)
    problems.push(`audience "${doc.audience}" but the file is in ${folder}/: keep them the same`);
  if (doc.summary !== undefined && !isText(doc.summary)) problems.push('summary: text');
  if (doc.copy !== undefined && !COPY_STATES.includes(doc.copy)) problems.push(`copy: one of ${COPY_STATES.join(', ')}`);
  const scenarios = doc.scenario === undefined ? [] : [doc.scenario].flat();
  if (!scenarios.length || !scenarios.every((s) => typeof s === 'string' && /^[\w-]+$/.test(s)))
    problems.push('scenario: a `pnpm seed` scenario, or a list of them applied in order (base for the base seed)');
  if (doc.order !== undefined && !Number.isInteger(doc.order)) problems.push('order: a whole number (lower comes first)');
  if (doc.open !== undefined && !(typeof doc.open === 'string' && /^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(doc.open)))
    problems.push('open: the app screen the guide starts on, as a path without the scheme (items, me/dev): the page links <scheme>://<open>');
  if (!Array.isArray(doc.covers) || !doc.covers.length || !doc.covers.every(isText))
    problems.push('covers: the repo paths or globs of the screens its steps show (route files, feature components, their copy)');
  else for (const c of doc.covers) if (path.isAbsolute(c) || c.split('/').includes('..')) problems.push(`covers: "${c}" must be relative to the repo root`);
  if (doc.setup !== undefined && !isCommandList(doc.setup)) problems.push('setup: a list of Maestro commands');
  if (!Array.isArray(doc.steps) || !doc.steps.length) problems.push('steps: at least one step');

  const steps = (Array.isArray(doc.steps) ? doc.steps : []).map((s, i) => {
    const at = `steps[${i + 1}]`;
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      problems.push(`${at}: a mapping with caption and do`);
      return null;
    }
    for (const k of Object.keys(s)) if (!STEP_KEYS.includes(k)) problems.push(`${at}: unknown key "${k}" (known: ${STEP_KEYS.join(', ')})`);
    if (!isText(s.caption)) problems.push(`${at}.caption: required text (it is also the screenshot's alt text)`);
    if (s.alt !== undefined && !isText(s.alt)) problems.push(`${at}.alt: text`);
    if (s.clip !== undefined && typeof s.clip !== 'boolean') problems.push(`${at}.clip: true or false`);
    if (s.do !== undefined && !isCommandList(s.do)) problems.push(`${at}.do: a list of Maestro commands`);
    return { caption: s.caption?.trim?.() ?? '', alt: (s.alt ?? s.caption)?.trim?.() ?? '', clip: s.clip === true, do: s.do ?? [] };
  });
  if (problems.length) throw new GuideError(file, problems);

  return {
    slug,
    file,
    dir: path.dirname(file),
    title: doc.title.trim(),
    audience: doc.audience,
    summary: doc.summary?.trim() ?? null,
    copy: doc.copy ?? 'placeholder',
    scenarios,
    order: doc.order ?? 100,
    open: doc.open ?? null,
    covers: doc.covers.map((c) => c.trim()),
    setup: doc.setup ?? [],
    steps,
  };
}

/** Every guide under `root` (<audience>/<slug>.yaml; files and folders starting with `_` are shared flows, not guides). */
export function loadGuides(root) {
  const guides = [];
  const errors = [];
  for (const a of AUDIENCE_IDS) {
    const dir = path.join(root, a);
    let files;
    try {
      files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f) && !f.startsWith('_') && statSync(path.join(dir, f)).isFile());
    } catch {
      continue;
    }
    for (const f of files) {
      const file = path.join(dir, f);
      try {
        guides.push(parseGuide(readFileSync(file, 'utf8'), file));
      } catch (e) {
        errors.push(e);
      }
    }
  }
  const seen = new Map();
  for (const g of guides) {
    if (seen.has(g.slug)) errors.push(new GuideError(g.file, [`another guide is also named "${g.slug}" (${seen.get(g.slug)}): names are unique across audiences`]));
    seen.set(g.slug, g.file);
  }
  return { guides: sortGuides(guides), errors };
}

export function sortGuides(guides) {
  return [...guides].sort((a, b) => AUDIENCE_IDS.indexOf(a.audience) - AUDIENCE_IDS.indexOf(b.audience) || a.order - b.order || a.title.localeCompare(b.title));
}

/** The guide whose slug (or <audience>/<slug>) is `name`. */
export function findGuide(guides, name) {
  return guides.find((g) => g.slug === name || `${g.audience}/${g.slug}` === name);
}

// ─── Maestro flows ─────────────────────────────────────────────────────────────────────────────────

const FILE_COMMANDS = ['runFlow', 'runScript'];

/**
 * A guide's commands with every file they name (runFlow, runScript, nested at any depth) made absolute from the
 * guide's folder, because the generated flow runs from elsewhere (.wt/tmp).
 */
export function absolutize(commands, fromDir) {
  const fix = (v) => (typeof v === 'string' && !path.isAbsolute(v) ? path.resolve(fromDir, v) : v);
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (FILE_COMMANDS.includes(k) && typeof v === 'string') out[k] = fix(v);
      else if (FILE_COMMANDS.includes(k) && v && typeof v === 'object' && !Array.isArray(v)) out[k] = walk({ ...v, ...(v.file ? { file: fix(v.file) } : {}) });
      else out[k] = walk(v);
    }
    return out;
  };
  return walk(commands);
}

/** The screenshot name for step `i` (0-based): step-01, step-02… */
export const shotName = (i) => `step-${String(i + 1).padStart(2, '0')}`;

/**
 * The Maestro runs that capture a guide, in order. Steps without a clip share one run (setup first), each ending
 * on a screenshot once the screen has settled. A clip step gets its own run, so the recorder can wrap exactly that
 * step; it also ends on a screenshot (the clip's poster, and its still where video can't play).
 * `mode: 'check'` is one run of everything with no screenshots: does every step still reach its screen?
 */
export function segmentsFor(guide, mode = 'build') {
  const settle = { waitForAnimationToEnd: { timeout: 3000 } };
  const shoot = (i) => [settle, { takeScreenshot: shotName(i) }];
  if (mode === 'check') return [{ kind: 'check', steps: guide.steps.map((_, i) => i), commands: [...guide.setup, ...guide.steps.flatMap((s) => s.do)] }];
  const segments = [];
  let current = { kind: 'shots', steps: [], commands: [...guide.setup] };
  guide.steps.forEach((s, i) => {
    if (!s.clip) {
      current.steps.push(i);
      current.commands.push(...s.do, ...shoot(i));
      return;
    }
    if (current.commands.length) segments.push(current);
    segments.push({ kind: 'clip', steps: [i], commands: [...s.do, ...shoot(i)] });
    current = { kind: 'shots', steps: [], commands: [] };
  });
  if (current.commands.length) segments.push(current);
  return segments;
}

/** One segment as a Maestro flow file, its paths absolute. `${APP_ID}` comes from maestroEnv, as in every saved flow. */
export function flowYaml(guide, segment, index) {
  const header = YAML.stringify({ appId: '${APP_ID}', name: `guide ${guide.audience}/${guide.slug} #${index + 1} (${segment.kind})` }, { lineWidth: 0 });
  return `# Generated by pnpm guide from ${guide.file}. Do not edit.\n${header}---\n${YAML.stringify(absolutize(segment.commands, guide.dir), { lineWidth: 0 })}`;
}

/** Whether a repo path (forward slashes, from the repo root) is one of a guide's `covers`: the path itself or a glob match. */
export function covered(file, pattern) {
  return file === pattern || path.posix.matchesGlob(file, pattern);
}

/** The guide's `covers` that match no file under `root`: a renamed or deleted screen, or a typo. */
export function staleCovers(guide, root) {
  return guide.covers.filter((c) => !existsSync(path.join(root, c)) && !globSync(c, { cwd: root }).length);
}

/** Every file a guide's commands name (runFlow, runScript), absolute: `pnpm guide check --static` checks they exist. */
export function referencedFiles(guide) {
  const files = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (FILE_COMMANDS.includes(k) && typeof v === 'string') files.push(v);
      else if (FILE_COMMANDS.includes(k) && v && typeof v === 'object' && typeof v.file === 'string') files.push(v.file);
      walk(v);
    }
  };
  walk(absolutize([...guide.setup, ...guide.steps.flatMap((s) => s.do)], guide.dir));
  return [...new Set(files)];
}
