// Fails a pull request whose title isn't a Conventional Commit, whose description leaves a required section empty
// (only the template's comment), or that has no changeset and doesn't say "No user-facing change" (docs/release.md).
// Run by .github/workflows/pr-body.yml on open, edit and push. Rules: scripts/ci/pr-rules.mjs.
// Locally: `node scripts/ci/check-pr-body.mjs <body.md> [--title "feat: …"]` (the changeset rule needs the PR's files).
import { readFileSync } from "node:fs";
import { changesetProblem, emptySections, isConventionalTitle, isReleasePr, TITLE_TYPES } from "./pr-rules.mjs";

const args = process.argv.slice(2);
const titleArg = args.indexOf("--title");
const bodyPath = args.find((a, i) => !a.startsWith("--") && i !== titleArg + 1);

const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : {};
const pr = event.pull_request ?? {};
const body = bodyPath ? readFileSync(bodyPath, "utf8") : (pr.body ?? "");
const title = titleArg >= 0 ? args[titleArg + 1] : pr.title;
const release = pr.base ? isReleasePr({ base: pr.base.ref, head: pr.head.ref }) : false;

/** The PR's changed files (with each new file's patch), from the GitHub API. */
async function prFiles() {
  const files = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/pulls/${pr.number}/files?per_page=100&page=${page}`, {
      headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    files.push(...batch);
    if (batch.length < 100) return files;
  }
}

const problems = [];
if (title !== undefined && !isConventionalTitle(title)) {
  problems.push(
    `The PR title "${title}" isn't a Conventional Commit: start it with ${TITLE_TYPES.join("/")}, an optional (scope) and ": ", for example "feat(items): offline edits".`,
  );
}
if (!release) {
  const missing = emptySections(body);
  if (missing.length > 0) {
    problems.push(
      `The PR description leaves these sections empty: ${missing.join(", ")}. Fill them from .github/pull_request_template.md. Delight: the polish applied and the peaks proposed (delight skill), or "Not user-facing".`,
    );
  }
  if (pr.number && process.env.GITHUB_TOKEN) {
    const problem = changesetProblem({ body, files: await prFiles() });
    if (problem) problems.push(problem);
  }
}

if (problems.length > 0) {
  for (const p of problems) console.error(p);
  process.exit(1);
}
console.log(release ? "Release PR: the title is conventional." : "PR: the title is conventional, every required section is filled and the changeset rule holds.");
