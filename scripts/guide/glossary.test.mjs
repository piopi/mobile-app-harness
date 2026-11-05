import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { glossaryPage, linkTerms, parseGlossary, plain, siteGlossary, termId, termsOf } from './glossary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const md = readFileSync(path.join(ROOT, 'GLOSSARY.md'), 'utf8');
const config = JSON.parse(readFileSync(path.join(ROOT, 'harness.config.json'), 'utf8'));

const SAMPLE = `# Title

## Language

**Saved list**:
A user's list,
on two lines (#12).
_Avoid_: Favourites

**Dev thing**:
Uses \`launch_status\`.

## Roles

**Admin**:
A person.
`;

describe('parseGlossary', () => {
  it('reads sections and terms, joining lines and dropping the _Avoid_ line', () => {
    expect(parseGlossary(SAMPLE)).toEqual([
      {
        section: 'Language',
        terms: [
          { name: 'Saved list', text: "A user's list, on two lines (#12)." },
          { name: 'Dev thing', text: 'Uses `launch_status`.' },
        ],
      },
      { section: 'Roles', terms: [{ name: 'Admin', text: 'A person.' }] },
    ]);
  });

  it('strips ticket numbers, code and emphasis', () => {
    expect(plain('An admin publishing it (#79). Its **Needs review** filter (`exampleapp://items`) works.')).toBe('An admin publishing it. Its Needs review filter works.');
  });
});

describe('siteGlossary', () => {
  it('shows only the allowlisted terms, grouped as GLOSSARY.md groups them, with the site’s own words where set', () => {
    const g = siteGlossary(SAMPLE, { 'Saved list': {}, Admin: { text: 'Someone who manages the app.', link: false } });
    expect(g).toEqual([
      { section: 'Language', terms: [{ name: 'Saved list', id: 'saved-list', text: "A user's list, on two lines.", link: true }] },
      { section: 'Roles', terms: [{ name: 'Admin', id: 'admin', text: 'Someone who manages the app.', link: false }] },
    ]);
  });

  it('shows nothing with an empty allowlist (the default)', () => {
    expect(siteGlossary(SAMPLE)).toEqual([]);
    expect(termsOf({})).toEqual({});
  });

  it('fails when an allowlisted term left GLOSSARY.md', () => {
    expect(() => siteGlossary(SAMPLE, { Gone: {} })).toThrow(/no longer has "Gone"/);
  });

  it('finds every term the project allowlists (harness.config.json guides.glossary) in its GLOSSARY.md, with no ticket numbers or code left', () => {
    const allow = termsOf(config);
    const terms = siteGlossary(md, allow).flatMap((s) => s.terms);
    expect(terms.map((t) => t.name).sort()).toEqual(Object.keys(allow).sort());
    for (const t of terms) expect(t.text).not.toMatch(/#\d|`|_Avoid_/);
  });
});

it('renders the page: a heading (an anchor) per term under its section', () => {
  const page = glossaryPage(siteGlossary(SAMPLE, { 'Saved list': {} }));
  expect(page).toContain('title: Glossary');
  expect(page).toContain("## Language\n\n### Saved list\n\nA user\\'s list\\, on two lines\\.");
  expect(termId('Sign-in code')).toBe('sign-in-code');
});

it('links a caption’s first use of a term, keeping its words and case, the longest name first', () => {
  const g = siteGlossary('## Words\n\n**Sign-in**:\nSigning in.\n\n**Sign-in code**:\nThe six digits.\n\n**Item**:\nA thing.\n', {
    'Sign-in': {},
    'Sign-in code': {},
    Item: { link: false },
  });
  const seen = new Set();
  const out = linkTerms('Type your sign-in code. Your Sign-in code again.', g, seen, '/glossary/');
  expect(out).toMatch(/^Type your <a class="term" href="\/glossary\/#sign-in-code" data-def="The six digits\.">sign-in code<\/a>\\. Your Sign\\-in code again\\.$/);
  expect(linkTerms('Finish the sign-in.', g, new Set(), '/glossary/')).toContain('href="/glossary/#sign-in"');
  // Once per guide: `seen` keeps what the guide already linked.
  expect(linkTerms('The sign-in code.', g, new Set(['sign-in-code', 'sign-in']), '/glossary/')).toBe('The sign\\-in code\\.');
  expect(linkTerms('Open an item', g, new Set(), '/glossary/')).toBe('Open an item');
});
