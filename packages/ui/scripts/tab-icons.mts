// Rasterise the tab glyphs (Phosphor, src/lib/icons.ts) to the template PNGs NativeTabs takes as `src` icons:
// `regular` for the unselected state, `fill` for the selected one. Reads Phosphor's own glyph data
// (phosphor-react-native/src/defs, filled paths on a 256 grid) and draws it with CanvasKit (Skia).
// 28 pt canvas: iOS draws tab images at their natural size (Phosphor's glyph box comes out ~21 pt); Android's
// Material bar scales them to its 24 dp icon slot. Black on transparent: the bar tints them.
//
//   pnpm --filter @app/ui tab-icons      # after changing a tab glyph or weight; commit the PNGs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_GLYPHS, TAB_ICONS, TAB_ICON_WEIGHTS } from '../src/lib/icons.ts';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '../assets/tab-icons');
const PT = 28;
const SCALES = [1, 2, 3] as const;

const CanvasKitInit = require('canvaskit-wasm/bin/canvaskit.js');
const bin = path.dirname(require.resolve('canvaskit-wasm/bin/canvaskit.wasm'));
const CK = await CanvasKitInit({ locateFile: (f: string) => path.join(bin, f) });
// The package exports no package.json; its main entry is lib/commonjs/index.js.
const defs = path.join(path.dirname(require.resolve('phosphor-react-native')), '../../src/defs');

/** The `d` of every <Path> in one weight of a Phosphor glyph. Fails loudly on anything that isn't a path. */
function glyphPaths(glyph: string, weight: string): string[] {
  const src = readFileSync(path.join(defs, `${glyph}.tsx`), 'utf8');
  const block = src.match(new RegExp(`\\[\\s*'${weight}',([\\s\\S]*?)\\]\\s*,\\s*(?:\\[|\\]\\))`))?.[1];
  if (!block) throw new Error(`${glyph}: no ${weight} weight`);
  if (/<(Circle|Rect|Line|Polyline|Polygon|Ellipse)\b/.test(block)) throw new Error(`${glyph} ${weight}: non-path element`);
  return [...block.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]!);
}

function render(paths: string[], scale: number): Uint8Array {
  const size = PT * scale;
  const surface = CK.MakeSurface(size, size);
  if (!surface) throw new Error('CanvasKit could not make a raster surface');
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);
  canvas.scale(size / 256, size / 256);
  const paint = new CK.Paint();
  paint.setAntiAlias(true);
  paint.setColor(CK.BLACK);
  paint.setStyle(CK.PaintStyle.Fill);
  for (const d of paths) canvas.drawPath(CK.Path.MakeFromSVGString(d), paint);
  const png = surface.makeImageSnapshot().encodeToBytes();
  surface.delete();
  if (!png) throw new Error('PNG encode failed');
  return png;
}

mkdirSync(out, { recursive: true });
for (const name of TAB_ICONS) {
  for (const [suffix, weight] of [
    ['', TAB_ICON_WEIGHTS.default],
    ['-selected', TAB_ICON_WEIGHTS.selected],
  ] as const) {
    const paths = glyphPaths(ICON_GLYPHS[name], weight);
    for (const scale of SCALES) {
      writeFileSync(path.join(out, `${name}${suffix}${scale === 1 ? '' : `@${scale}x`}.png`), render(paths, scale));
    }
  }
}
console.log(`tab icons: ${TAB_ICONS.length * 2 * SCALES.length} PNGs (${TAB_ICON_WEIGHTS.default} / ${TAB_ICON_WEIGHTS.selected}) in ${path.relative(process.cwd(), out)}`);
