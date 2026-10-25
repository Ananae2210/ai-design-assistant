import { describe, expect, it } from "vitest";
import { parseColor, toHex } from "./color";
import { checkContrast, contrastRatio, isLargeText, suggestForeground } from "./wcag";

const c = (s: string) => {
  const rgb = parseColor(s);
  if (!rgb) throw new Error(`bad colour ${s}`);
  return rgb;
};

describe("parseColor", () => {
  it("reads short hex, long hex and rgb()", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("1a2B3c")).toEqual({ r: 26, g: 43, b: 60 });
    expect(parseColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30 });
  });

  it("rejects invalid input", () => {
    expect(parseColor("#ggg")).toBeNull();
    expect(parseColor("rgb(300, 0, 0)")).toBeNull();
    expect(parseColor("blue")).toBeNull();
  });

  it("round-trips through toHex", () => {
    expect(toHex(c("#0a7cff"))).toBe("#0a7cff");
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    expect(contrastRatio(c("#000"), c("#fff"))).toBeCloseTo(21, 5);
    expect(contrastRatio(c("#777"), c("#777"))).toBe(1);
  });

  it("matches known reference values", () => {
    // Values from the WebAIM contrast checker.
    expect(contrastRatio(c("#767676"), c("#fff"))).toBeCloseTo(4.54, 2);
    expect(contrastRatio(c("#0000ff"), c("#fff"))).toBeCloseTo(8.59, 2);
  });

  it("is symmetric", () => {
    expect(contrastRatio(c("#333"), c("#eee"))).toBe(contrastRatio(c("#eee"), c("#333")));
  });
});

describe("isLargeText", () => {
  it("follows the WCAG large-text definition", () => {
    expect(isLargeText({ px: 24, bold: false })).toBe(true);
    expect(isLargeText({ px: 23, bold: false })).toBe(false);
    expect(isLargeText({ px: 19, bold: true })).toBe(true);
    expect(isLargeText({ px: 18, bold: true })).toBe(false);
  });
});

describe("checkContrast", () => {
  it("passes AA but fails AAA for #767676 body text on white", () => {
    const r = checkContrast(c("#767676"), c("#fff"), { px: 16, bold: false });
    expect(r.passes).toEqual({ AA: true, AAA: false, nonText: true });
  });

  it("uses the lower threshold for large text", () => {
    const grey = c("#949494"); // ~3.03:1 on white
    expect(checkContrast(grey, c("#fff"), { px: 16, bold: false }).passes.AA).toBe(false);
    expect(checkContrast(grey, c("#fff"), { px: 32, bold: false }).passes.AA).toBe(true);
  });
});

describe("suggestForeground", () => {
  it("returns the original colour when it already passes", () => {
    expect(suggestForeground(c("#000"), c("#fff"), 4.5)).toBe("#000000");
  });

  it("finds a passing colour that keeps the hue", () => {
    const fg = c("#ff8a65");
    const bg = c("#fff");
    const hex = suggestForeground(fg, bg, 4.5);
    expect(hex).not.toBeNull();
    expect(contrastRatio(c(hex!), bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("can lighten text on a dark background", () => {
    const bg = c("#111");
    const hex = suggestForeground(c("#444"), bg, 7);
    expect(contrastRatio(c(hex!), bg)).toBeGreaterThanOrEqual(7);
  });

  it("returns null when the target is impossible", () => {
    expect(suggestForeground(c("#888"), c("#888"), 22)).toBeNull();
  });
});
