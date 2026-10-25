import { type RGB, toHex } from "@/lib/contrast";

export type Swatch = { rgb: RGB; hex: string; share: number };

type Options = {
  /** Maximum colours to return. */
  max?: number;
  /** Colours closer than this (RGB distance) are merged into one swatch. */
  mergeDistance?: number;
  /** Colours covering less than this fraction of the image are dropped. */
  minShare?: number;
  /** Read every nth pixel; higher is faster on big screenshots. */
  stride?: number;
};

const distance = (a: RGB, b: RGB) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

/**
 * Finds the main colours in RGBA pixel data (as returned by canvas getImageData).
 * Pixels are grouped into coarse buckets, then near-identical buckets are merged
 * so anti-aliasing and compression noise don't show up as separate colours.
 */
export function extractPalette(data: Uint8ClampedArray, options: Options = {}): Swatch[] {
  const { max = 8, mergeDistance = 28, minShare = 0.005, stride = 1 } = options;
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
  let total = 0;

  for (let i = 0; i < data.length; i += 4 * stride) {
    if (data[i + 3] < 128) continue; // skip transparent pixels
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
    total++;
  }
  if (total === 0) return [];

  const sorted = [...buckets.values()]
    .map(({ r, g, b, count }) => ({ rgb: { r: r / count, g: g / count, b: b / count }, count }))
    .sort((a, b) => b.count - a.count);

  const merged: { rgb: RGB; count: number }[] = [];
  for (const bucket of sorted) {
    const near = merged.find((m) => distance(m.rgb, bucket.rgb) < mergeDistance);
    if (near) near.count += bucket.count;
    else merged.push({ ...bucket });
  }

  return merged
    .map(({ rgb, count }) => {
      const rounded = { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) };
      return { rgb: rounded, hex: toHex(rounded), share: count / total };
    })
    .filter((s) => s.share >= minShare)
    .sort((a, b) => b.share - a.share)
    .slice(0, max);
}
