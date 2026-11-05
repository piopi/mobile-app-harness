// The how-to guides site: Astro Starlight, for its full-text search (Pagefind, a static index that needs no server),
// its docs layout, its phone menu and its light/dark switch. `pnpm guide render` writes the pages
// (src/content/docs/), the clips (public/) and src/generated/ from the guides' captures, then builds this into
// guides-out/ with the base path it passes (`/` locally, `/<repo>/` on a GitHub Pages project site). Nothing here is
// project copy: the words are in scripts/guide/render.mjs, the name in harness.config.json, the colours in
// packages/ui/src/theme.css.
import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import starlight from '@astrojs/starlight';

const generated = new URL('./src/generated/site.json', import.meta.url);
const site = existsSync(generated) ? JSON.parse(readFileSync(generated, 'utf8')) : { name: 'Guides', sidebar: [] };

// The site's one small script (when things reveal, search, the progress line, clips): inlined so nothing waits on it.
const SCRIPT = readFileSync(new URL('./src/lib/site.js', import.meta.url), 'utf8');

export default defineConfig({
  trailingSlash: 'always',
  // Captions keep their own typography: the app's copy is word for word, curly quotes and all.
  markdown: { processor: satteri({ features: { smartPunctuation: false } }) },
  integrations: [
    starlight({
      title: site.name,
      favicon: '/favicon.png',
      sidebar: site.sidebar,
      head: [{ tag: 'script', content: SCRIPT }],
      customCss: ['./src/generated/tokens.css', './src/styles/brand.css'],
      components: {
        PageTitle: './src/components/PageTitle.astro',
        Footer: './src/components/Footer.astro',
      },
      tableOfContents: false,
      credits: false,
    }),
  ],
});
