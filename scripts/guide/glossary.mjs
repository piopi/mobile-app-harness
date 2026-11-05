// The guides site's glossary page, generated from the repo's GLOSSARY.md so it follows every change to it. GLOSSARY.md
// is written for the people building the app; the site shows only the terms a user meets: an allowlist,
// `guides.glossary` in harness.config.json (a term's name in GLOSSARY.md, mapped to `{}` or to `{ text, link }`), so
// the glossary stays one plain list for agents. A term whose GLOSSARY definition reads like a developer note carries
// its own plain-language `text` (new copy: it needs the human's yes); the others show GLOSSARY's words without their
// `_Avoid_` line, ticket numbers or code. An empty allowlist (the default) means no glossary page.
import { escapeHtml, escapeMarkdown } from './text.mjs';

/**
 * The allowlist from harness.config.json (`guides.glossary`), by GLOSSARY.md name. `text`: the site's plain definition
 * instead of GLOSSARY's. `link: false`: never linked from a caption (too common a word).
 * @returns {Record<string, { text?: string, link?: boolean }>}
 */
export const termsOf = (config) => config?.guides?.glossary ?? {};

/** The glossary page's title, and the landing's link to it. */
export const GLOSSARY_WORDS = { title: 'Glossary', link: 'Glossary' };

/** A term's anchor on the glossary page: `account-gate`, `sign-in-code`. */
export const termId = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** GLOSSARY's words without what a reader doesn't need: ticket numbers, code, Markdown emphasis. */
export function plain(text) {
  return text
    .replace(/\s*\((?:#\d+[^)]*)\)/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** GLOSSARY.md as sections of terms: `[{ section, terms: [{ name, text }] }]`, in its order. */
export function parseGlossary(md) {
  const sections = [];
  let term = null;
  for (const line of md.split('\n')) {
    const h = line.match(/^## (.+)/);
    if (h) {
      sections.push({ section: h[1].trim(), terms: [] });
      term = null;
      continue;
    }
    const t = line.match(/^\*\*(.+?)\*\*:\s*$/);
    if (t && sections.length) {
      term = { name: t[1].trim(), text: '' };
      sections.at(-1).terms.push(term);
      continue;
    }
    if (!term || !line.trim() || /^_Avoid_/.test(line)) {
      if (!line.trim() && term?.text) term = null;
      continue;
    }
    term.text = `${term.text} ${line.trim()}`.trim();
  }
  return sections;
}

/** The terms the site shows, grouped as GLOSSARY.md groups them. Throws when an allowlisted term left GLOSSARY.md. */
export function siteGlossary(md, terms = {}) {
  const sections = parseGlossary(md);
  const found = new Set(sections.flatMap((s) => s.terms.map((t) => t.name)));
  const gone = Object.keys(terms).filter((n) => !found.has(n));
  if (gone.length) throw new Error(`GLOSSARY.md no longer has ${gone.map((n) => `"${n}"`).join(', ')}: update guides.glossary in harness.config.json`);
  return sections
    .map((s) => ({
      section: s.section,
      terms: s.terms
        .filter((t) => terms[t.name])
        .map((t) => ({
          name: t.name,
          id: termId(t.name),
          text: terms[t.name].text ?? plain(t.text),
          link: terms[t.name].link !== false,
        })),
    }))
    .filter((s) => s.terms.length);
}

/** The glossary page's Markdown: a heading (and so an anchor) per term, grouped by GLOSSARY's sections. */
export function glossaryPage(glossary) {
  const body = glossary.map(
    (s) => `## ${escapeMarkdown(s.section)}\n\n${s.terms.map((t) => `### ${escapeMarkdown(t.name)}\n\n${escapeMarkdown(t.text)}\n`).join('\n')}`,
  );
  return `---\ntitle: ${GLOSSARY_WORDS.title}\nsidebar:\n  order: 1000\n---\n\n<div class="glossary">\n\n${body.join('\n')}\n</div>\n`;
}

/**
 * A caption as Markdown with the first use of each glossary term in the guide linked to its definition (`seen` holds
 * the terms the guide already linked). Longer names win ("Sign-in code" before "Sign-in"); matching ignores case
 * but keeps the caption's words. The link carries the definition for the hover card.
 */
export function linkTerms(caption, glossary, seen, href) {
  const terms = glossary
    .flatMap((s) => s.terms)
    .filter((t) => t.link)
    .sort((a, b) => b.name.length - a.name.length);
  const hits = [];
  for (const t of terms) {
    if (seen.has(t.id)) continue;
    const re = new RegExp(`(?<![\\w-])${t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i');
    const m = caption.match(re);
    if (!m) continue;
    const at = m.index;
    if (hits.some((h) => at < h.end && at + m[0].length > h.at)) continue;
    hits.push({ at, end: at + m[0].length, term: t });
    seen.add(t.id);
  }
  hits.sort((a, b) => a.at - b.at);
  let out = '';
  let from = 0;
  for (const h of hits) {
    out += escapeMarkdown(caption.slice(from, h.at));
    out += `<a class="term" href="${escapeHtml(`${href}#${h.term.id}`)}" data-def="${escapeHtml(h.term.text)}">${escapeHtml(caption.slice(h.at, h.end))}</a>`;
    from = h.end;
  }
  return out + escapeMarkdown(caption.slice(from));
}
