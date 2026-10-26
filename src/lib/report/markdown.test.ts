import { describe, expect, it } from "vitest";
import type { Pair } from "@/lib/palette";
import { buildMarkdownReport } from "./markdown";

const swatch = (hex: string) => ({ hex, rgb: { r: 0, g: 0, b: 0 }, share: 0.1 });
const pairs: Pair[] = [{ fg: swatch("#949494"), bg: swatch("#ffffff"), ratio: 3.03, verdict: "large-only" }];

describe("buildMarkdownReport", () => {
  it("lists AI issues with severity, WCAG link and fix, then the measured pairs", () => {
    const md = buildMarkdownReport({
      fileName: "checkout.png",
      date: new Date("2026-10-26T10:00:00Z"),
      pairs,
      critique: {
        summary: "Clean layout.",
        strengths: ["Clear primary button"],
        issues: [
          {
            title: "Faint helper text",
            category: "accessibility",
            severity: "major",
            wcag: "1.4.3",
            location: "Below the card field",
            problem: "Too light to read.",
            fix: "Use #5c5c66.",
          },
        ],
      },
    });
    expect(md).toContain("# Design review: checkout.png");
    expect(md).toContain("2026-10-26");
    expect(md).toContain("### 1. Faint helper text");
    expect(md).toContain("major · accessibility · [WCAG 1.4.3]");
    expect(md).toContain("**Fix:** Use #5c5c66.");
    expect(md).toContain("| `#949494` | `#ffffff` | 3.03:1 | Large text only |");
    expect(md).toContain("written by AI");
  });

  it("works without an AI review", () => {
    const md = buildMarkdownReport({ fileName: "a.png", date: new Date(), pairs: [], critique: null });
    expect(md).not.toContain("## Issues");
    expect(md).not.toContain("written by AI");
    expect(md).toContain("No colour pairs were measured.");
  });
});
