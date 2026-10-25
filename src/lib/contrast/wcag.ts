import { type RGB, hslToRgb, rgbToHsl, toHex } from "./color";

/** WCAG 2.x relative luminance. https://www.w3.org/TR/WCAG22/#dfn-relative-luminance */
export function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export type TextSize = { px: number; bold: boolean };

/** WCAG "large text": at least 18pt (24px), or 14pt (~18.66px) bold. */
export function isLargeText({ px, bold }: TextSize): boolean {
  return px >= 24 || (bold && px >= 18.66);
}

export type Level = "AA" | "AAA";

export function requiredRatio(level: Level, large: boolean): number {
  if (level === "AA") return large ? 3 : 4.5;
  return large ? 4.5 : 7;
}

export type CheckResult = {
  ratio: number;
  large: boolean;
  passes: { AA: boolean; AAA: boolean; nonText: boolean };
};

export function checkContrast(fg: RGB, bg: RGB, size: TextSize): CheckResult {
  const ratio = contrastRatio(fg, bg);
  const large = isLargeText(size);
  return {
    ratio,
    large,
    passes: {
      AA: ratio >= requiredRatio("AA", large),
      AAA: ratio >= requiredRatio("AAA", large),
      // SC 1.4.11: icons, borders and other UI parts need 3:1.
      nonText: ratio >= 3,
    },
  };
}

/**
 * Finds the passing foreground colour closest to the original by moving only
 * its lightness, so hue and saturation (the brand feel) stay the same.
 * Returns null if neither direction can reach the target.
 */
export function suggestForeground(fg: RGB, bg: RGB, target: number): string | null {
  if (contrastRatio(fg, bg) >= target) return toHex(fg);

  const hsl = rgbToHsl(fg);
  const candidates: { hex: string; delta: number }[] = [];

  for (const direction of [-1, 1]) {
    for (let step = 1; step <= 100; step++) {
      const l = hsl.l + (direction * step) / 100;
      if (l < 0 || l > 1) break;
      const rgb = hslToRgb({ ...hsl, l });
      const rounded = { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) };
      if (contrastRatio(rounded, bg) >= target) {
        candidates.push({ hex: toHex(rounded), delta: step });
        break;
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.delta - b.delta);
  return candidates[0].hex;
}
