// `pnpm guide serve`: the built site (guides-out/) on this slot's port, mounted at the base path it was built for, the
// way GitHub Pages serves it: a folder without its trailing slash redirects, and a missing page gets Starlight's 404.
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

export const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

/**
 * What to answer for a request path: `{ file }` (200), `{ redirect }` (301) or `{ notFound }` (404, with Starlight's
 * 404.html when there is one). `base` is `/` or `/name/`.
 */
export function siteFile(outDir, base, pathname) {
  const notFound = () => ({ notFound: existsSync(path.join(outDir, '404.html')) ? path.join(outDir, '404.html') : null });
  let p;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    return notFound();
  }
  if (p === base.replace(/\/$/, '') || (base !== '/' && p === '/')) return { redirect: base };
  if (!p.startsWith(base)) return notFound();
  const file = path.join(outDir, path.normalize(`/${p.slice(base.length)}`));
  if (file !== outDir && !file.startsWith(outDir + path.sep)) return notFound();
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!p.endsWith('/')) return { redirect: `${p}/` };
    return existsSync(path.join(file, 'index.html')) ? { file: path.join(file, 'index.html') } : notFound();
  }
  return existsSync(file) ? { file } : notFound();
}
