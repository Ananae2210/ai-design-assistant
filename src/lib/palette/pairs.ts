import { contrastRatio, requiredRatio } from "@/lib/contrast";
import type { Swatch } from "./extract";

export type PairVerdict = "pass" | "large-only" | "fail";

/** A foreground colour rated as if it were text on a background colour. */
export type Pair = { fg: Swatch; bg: Swatch; ratio: number; verdict: PairVerdict };

export function verdictFor(ratio: number): PairVerdict {
  if (ratio >= requiredRatio("AA", false)) return "pass";
  if (ratio >= requiredRatio("AA", true)) return "large-only";
  return "fail";
}

/**
 * Colours covering a large part of the screen are treated as backgrounds, and
 * every other colour is rated against each of them. Comparing small colours
 * with each other would mostly pair icons with anti-aliasing, which is noise.
 * The largest colour always counts as a background.
 */
export function ratePairs(swatches: Swatch[], backgroundShare = 0.1): Pair[] {
  const backgrounds = swatches.filter((s, i) => i === 0 || s.share >= backgroundShare);
  const foregrounds = swatches.filter((s) => !backgrounds.includes(s));
  const pairs: Pair[] = [];
  for (const bg of backgrounds) {
    for (const fg of foregrounds) {
      const ratio = contrastRatio(fg.rgb, bg.rgb);
      pairs.push({ fg, bg, ratio, verdict: verdictFor(ratio) });
    }
  }
  return pairs.sort((x, y) => x.ratio - y.ratio);
}
