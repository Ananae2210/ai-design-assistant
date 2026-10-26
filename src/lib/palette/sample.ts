import type { RGB } from "@/lib/contrast";

/**
 * Picks a letter's ink colour from the RGBA pixels around a click.
 *
 * Clicks rarely land on a glyph's solid core, and its edge pixels are blended
 * with the background, so the pixel that differs most from the window's
 * average is taken as the true ink colour. Transparent pixels (outside the
 * image, or see-through PNG areas) are ignored.
 */
export function pickInkColor(data: Uint8ClampedArray): RGB | null {
  const opaque: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 128) opaque.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  if (opaque.length === 0) return null;

  const mean = opaque.reduce(
    (m, p) => ({ r: m.r + p.r / opaque.length, g: m.g + p.g / opaque.length, b: m.b + p.b / opaque.length }),
    { r: 0, g: 0, b: 0 },
  );

  let best = opaque[0];
  let bestDistance = -1;
  for (const p of opaque) {
    const d = Math.hypot(p.r - mean.r, p.g - mean.g, p.b - mean.b);
    if (d > bestDistance) {
      bestDistance = d;
      best = p;
    }
  }
  return best;
}
