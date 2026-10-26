import { describe, expect, it } from "vitest";
import { pickInkColor } from "./sample";

const px = (...colours: [number, number, number, number][]) => new Uint8ClampedArray(colours.flat());

describe("pickInkColor", () => {
  it("finds the solid letter colour among anti-aliased edge pixels", () => {
    const white: [number, number, number, number] = [255, 255, 255, 255];
    const edge: [number, number, number, number] = [255, 190, 170, 255];
    const ink: [number, number, number, number] = [255, 138, 101, 255];
    expect(pickInkColor(px(white, white, edge, ink, edge, white, white))).toEqual({ r: 255, g: 138, b: 101 });
  });

  it("ignores transparent pixels from outside the image", () => {
    // Without the alpha check, these would read as solid black.
    const outside: [number, number, number, number] = [0, 0, 0, 0];
    const bg: [number, number, number, number] = [250, 250, 250, 255];
    expect(pickInkColor(px(outside, outside, bg, bg, bg, [30, 30, 30, 255]))).toEqual({
      r: 30,
      g: 30,
      b: 30,
    });
  });

  it("returns null when every pixel is transparent", () => {
    expect(pickInkColor(px([0, 0, 0, 0]))).toBeNull();
  });
});
