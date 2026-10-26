/**
 * Scales a width and height down (never up) so the longer side is at most
 * `maxEdge`, keeping the aspect ratio. 1568px is the largest edge Claude's
 * vision uses without resizing, so sending more only costs upload time.
 */
export function fitWithin(width: number, height: number, maxEdge = 1568) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale), scale };
}
