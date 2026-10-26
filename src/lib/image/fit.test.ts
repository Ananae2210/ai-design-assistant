import { describe, expect, it } from "vitest";
import { fitWithin } from "./fit";

describe("fitWithin", () => {
  it("shrinks the longer edge to the limit and keeps the ratio", () => {
    expect(fitWithin(3136, 1764)).toEqual({ width: 1568, height: 882, scale: 0.5 });
    expect(fitWithin(1170, 2532, 1266)).toEqual({ width: 585, height: 1266, scale: 0.5 });
  });

  it("never enlarges a small image", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600, scale: 1 });
  });
});
