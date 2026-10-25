import { describe, expect, it } from "vitest";
import { extractPalette, ratePairs, verdictFor } from ".";

/** Builds RGBA pixel data from [colour, pixelCount] runs. */
function pixels(runs: [[number, number, number, number?], number][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [[r, g, b, a = 255], n] of runs) {
    for (let i = 0; i < n; i++) out.push(r, g, b, a);
  }
  return new Uint8ClampedArray(out);
}

describe("extractPalette", () => {
  it("returns colours ordered by how much of the image they cover", () => {
    const palette = extractPalette(
      pixels([
        [[255, 255, 255], 700],
        [[20, 20, 20], 200],
        [[79, 70, 229], 100],
      ]),
    );
    expect(palette.map((s) => s.hex)).toEqual(["#ffffff", "#141414", "#4f46e5"]);
    expect(palette[0].share).toBeCloseTo(0.7);
  });

  it("merges near-identical colours from anti-aliasing", () => {
    const palette = extractPalette(
      pixels([
        [[255, 255, 255], 500],
        [[250, 250, 252], 400],
        [[0, 0, 0], 100],
      ]),
    );
    expect(palette).toHaveLength(2);
    expect(palette[0].share).toBeCloseTo(0.9);
  });

  it("drops tiny colours and transparent pixels", () => {
    const palette = extractPalette(
      pixels([
        [[255, 255, 255], 999],
        [[255, 0, 0], 1],
        [[0, 0, 0, 0], 500],
      ]),
    );
    expect(palette.map((s) => s.hex)).toEqual(["#ffffff"]);
  });

  it("handles empty input", () => {
    expect(extractPalette(new Uint8ClampedArray())).toEqual([]);
  });
});

describe("ratePairs", () => {
  const palette = extractPalette(
    pixels([
      [[255, 255, 255], 800], // page background
      [[17, 17, 17], 100], // card background
      [[148, 148, 148], 40], // grey caption
      [[0, 0, 0], 30], // body text
    ]),
  );

  it("rates small colours against each large background, worst first", () => {
    const pairs = ratePairs(palette);
    expect(pairs.map((p) => `${p.fg.hex} on ${p.bg.hex}`)).toEqual([
      "#000000 on #111111",
      "#949494 on #ffffff",
      "#949494 on #111111",
      "#000000 on #ffffff",
    ]);
    expect(pairs.map((p) => p.verdict)).toEqual(["fail", "large-only", "pass", "pass"]);
  });

  it("never compares two small colours with each other", () => {
    const pairs = ratePairs(palette, 0.5);
    expect(pairs.every((p) => p.bg.hex === "#ffffff")).toBe(true);
    expect(pairs).toHaveLength(3);
  });

  it("maps ratios to verdicts using AA thresholds", () => {
    expect(verdictFor(4.5)).toBe("pass");
    expect(verdictFor(3.2)).toBe("large-only");
    expect(verdictFor(2.9)).toBe("fail");
  });
});
