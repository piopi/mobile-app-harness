import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { siteGlossary } from './glossary.mjs';
import { parseGuide } from './model.mjs';
import { escapeHtml, escapeMarkdown, LANDING, normalizeBase, renderContent, SITE, themeTokens, tokensCss } from './render.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const APP = { name: 'Example App', scheme: 'exampleapp' };

const make = (audience, slug, over = {}) =>
  parseGuide(
    YAML.stringify({
      title: `Guide ${slug}`,
      audience,
      scenario: 'many-items',
      covers: ['apps/mobile/src/app/(tabs)/items/index.tsx'],
      steps: [
        { caption: 'Open the Items tab, then type your sign-in code.', do: [] },
        { caption: 'Tap “Publish” <now> & go.', clip: true, do: [] },
      ],
      ...over,
    }),
    `/g/${audience}/${slug}.yaml`,
  );
const shots = (n, clip = 1) => ({ steps: Array.from({ length: n }, (_, i) => ({ image: `step-0${i + 1}.png`, clip: i === clip ? `step-0${i + 1}.mp4` : null, width: 804, height: 1748 })) });
const glossary = siteGlossary('## Words\n\n**Sign-in code**:\nThe six digits mailed to you.\n\n**Item**:\nA thing in the list.\n', { 'Sign-in code': {}, Item: { link: false } });

describe('escaping', () => {
  it('escapes HTML values, and every Markdown punctuation mark', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(escapeMarkdown('1. *Tap* [Undo] <b>')).toBe('1\\. \\*Tap\\* \\[Undo\\] \\<b\\>');
  });
});

describe('themeTokens', () => {
  it('reads both appearances’ colours from the app’s theme.css', () => {
    const css = readFileSync(path.join(ROOT, 'packages/ui/src/theme.css'), 'utf8');
    const light = themeTokens(css, 'light');
    const dark = themeTokens(css, 'dark');
    expect(light['--color-background']).toMatch(/^#/);
    expect(dark['--color-background']).toMatch(/^#/);
    expect(dark['--color-background']).not.toBe(light['--color-background']);
    const out = tokensCss({ light, dark });
    expect(out).toContain(`:root[data-theme='dark'] {\n  --color-background: ${dark['--color-background']};`);
    expect(out).toContain(`:root[data-theme='light'] {\n  --color-background: ${light['--color-background']};`);
  });

  it('ignores comments and refuses a theme without the block', () => {
    expect(themeTokens('@variant dark { /* --color-x: #fff; */ --color-y: #000; }')).toEqual({ '--color-y': '#000' });
    expect(() => themeTokens(':root { --color-y: #000; }', 'light')).toThrow(/no `@variant light`/);
  });
});

it('normalizes a base path for Astro', () => {
  expect(normalizeBase()).toBe('/');
  expect(normalizeBase('/')).toBe('/');
  expect(normalizeBase('app-guides')).toBe('/app-guides/');
  expect(normalizeBase('/app-guides')).toBe('/app-guides/');
});

describe('renderContent', () => {
  const browse = make('users', 'browse-items', { order: 1, summary: 'Find what you need.', open: 'items' });
  const appearance = make('users', 'appearance', { order: 2, copy: 'approved' });
  const publish = make('admins', 'publish-item');
  const missing = make('admins', 'settings');
  const changed = make('users', 'sign-out', { order: 3 });
  const { pages, media, site, skipped, built } = renderContent({
    guides: [browse, appearance, changed, publish, missing],
    captures: { 'browse-items': shots(2), appearance: shots(2, -1), 'publish-item': shots(2), 'sign-out': shots(3) },
    base: '/app-guides',
    glossary,
    app: APP,
  });
  const page = pages.get('users/browse-items/index.md');

  it('writes a Markdown page per built guide, and the glossary', () => {
    expect([...pages.keys()].sort()).toEqual(['admins/publish-item/index.md', 'glossary/index.md', 'users/appearance/index.md', 'users/browse-items/index.md']);
    expect(built.map((g) => g.slug)).toEqual(['browse-items', 'appearance', 'publish-item']);
  });

  it('leaves out guides not built, or whose steps changed since', () => {
    expect(skipped.map((s) => [s.guide.slug, s.reason])).toEqual([
      ['sign-out', 'captured 3 steps, the guide has 2'],
      ['settings', 'not built yet'],
    ]);
  });

  it('gives Starlight the title, summary, sidebar place and Draft badge', () => {
    const fm = YAML.parse(page.split('---\n')[1]);
    expect(fm).toEqual({ title: 'Guide browse-items', description: 'Find what you need.', sidebar: { order: 1, badge: { text: SITE.draft, variant: 'caution' } } });
    expect(YAML.parse(pages.get('users/appearance/index.md').split('---\n')[1]).sidebar).toEqual({ order: 2 });
  });

  it('renders each step: its caption (escaped, terms linked), a still with the caption as alt text, or a clip that waits for its script', () => {
    expect(page).toContain('1. Open the Items tab\\, then type your <a class="term" href="/app-guides/glossary/#sign-in-code" data-def="The six digits mailed to you.">sign-in code</a>\\.');
    expect(page).toContain('![Open the Items tab\\, then type your sign\\-in code\\.](./step-01.png)');
    expect(page).toContain('2. Tap “Publish” \\<now\\> \\& go\\.');
    expect(page).toContain(
      '<video src="/app-guides/users/browse-items/step-02.mp4" poster="/app-guides/users/browse-items/step-02.png" muted loop playsinline controls preload="metadata" data-autoplay data-pagefind-ignore aria-label="Tap “Publish” &lt;now&gt; &amp; go."',
    );
    expect(page).not.toMatch(/<video[^>]* autoplay/);
    expect(page.match(/class="phone"/g)).toHaveLength(2);
  });

  it('draws the progress line, the app link (the app’s own scheme) and the closing line', () => {
    expect(page).toContain('<div class="guide-progress" aria-hidden="true" data-steps="2">');
    expect(page).toContain(`<a class="guide-open" href="exampleapp://items">${LANDING.openInApp} →</a>`);
    expect(pages.get('users/appearance/index.md')).not.toContain('guide-open');
    expect(page).toContain(`<p class="guide-done" data-pagefind-ignore>${escapeHtml(LANDING.done)}</p>`);
  });

  it('copies stills beside their page, clips and posters and each first screen to public/', () => {
    expect(media.filter((m) => m.guide === browse).map((m) => m.to)).toEqual([
      'content/users/browse-items/step-01.png',
      'public/users/browse-items/step-02.mp4',
      'public/users/browse-items/step-02.png',
      'public/users/browse-items/step-01.png',
    ]);
  });

  it('describes the landing and audience pages, and a sidebar grouped by audience', () => {
    expect(site.name).toBe('Example App');
    expect(site.sidebar).toEqual([
      { label: 'Using the app', items: ['users/browse-items', 'users/appearance'] },
      { label: 'Admins', items: ['admins/publish-item'] },
      'glossary',
    ]);
    expect(site.audiences.map((a) => [a.id, a.count])).toEqual([
      ['users', '2 guides'],
      ['admins', '1 guide'],
    ]);
    expect(site.audiences[0].guides[0]).toEqual({
      title: 'Guide browse-items',
      summary: 'Find what you need.',
      href: 'users/browse-items/',
      steps: '2 steps',
      thumb: 'users/browse-items/step-01.png',
      draft: true,
    });
    expect(site.words.intro).toBe(SITE.intro);
    expect(site.words.footer).toBe('Example App');
    expect(site.glossary.href).toBe('glossary/');
  });

  it('has no glossary page with no terms', () => {
    const none = renderContent({ guides: [appearance], captures: { appearance: shots(2, -1) }, app: APP });
    expect([...none.pages.keys()]).toEqual(['users/appearance/index.md']);
    expect(none.site.glossary).toBeNull();
  });
});
