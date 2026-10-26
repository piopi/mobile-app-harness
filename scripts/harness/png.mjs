// A tiny PNG writer (no dependencies) for the placeholder app icons `pnpm harness:apply` draws from the brand
// colours: a filled background and a centred disc, anti-aliased by 4x4 supersampling. Replace the generated
// icons with real artwork whenever the brand has some; the apply script leaves files it did not write alone.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** "#rrggbb" → [r, g, b, 255]; null → transparent. */
export function rgba(hex) {
  if (!hex) return [0, 0, 0, 0];
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), 255];
}

/**
 * Write a size×size PNG: `background` everywhere (null = transparent), then a disc of `discColor` whose diameter
 * is `disc` × size (0 = none).
 */
export function writeIcon(file, spec) {
  writeFileSync(file, encodeIcon(spec));
}

/** The PNG bytes for an icon spec (see writeIcon). */
export function encodeIcon({ size, background = null, discColor = null, disc = 0 }) {
  const bg = rgba(background);
  const fg = rgba(discColor);
  const r = (disc * size) / 2;
  const c = size / 2;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const S = 4;
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      let cover = 0;
      if (r > 0) {
        for (let sy = 0; sy < S; sy++)
          for (let sx = 0; sx < S; sx++) {
            const dx = x + (sx + 0.5) / S - c;
            const dy = y + (sy + 0.5) / S - c;
            if (dx * dx + dy * dy <= r * r) cover++;
          }
      }
      const a = cover / (S * S);
      const outA = fg[3] * a + bg[3] * (1 - a);
      const px = row + 1 + x * 4;
      for (let i = 0; i < 3; i++) raw[px + i] = outA === 0 ? 0 : Math.round((fg[i] * fg[3] * a + bg[i] * bg[3] * (1 - a)) / outA);
      raw[px + 3] = Math.round(outA);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
