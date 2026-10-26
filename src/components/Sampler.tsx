"use client";

import { useState } from "react";

type Point = { x: number; y: number };

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The screenshot, with a colour picker that works by mouse and by keyboard.
 * Positions are fractions of the image (0 to 1), so they don't depend on how
 * large the image is drawn.
 */
export default function Sampler({
  imageUrl,
  picking,
  onSample,
}: {
  imageUrl: string;
  picking: "text" | "background";
  onSample: (point: Point) => void;
}) {
  const [cursor, setCursor] = useState<Point>({ x: 0.5, y: 0.5 });
  const [showCursor, setShowCursor] = useState(false);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 0.002 : 0.01;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      setShowCursor(true);
      setCursor((c) => ({ x: clamp(c.x + move.x), y: clamp(c.y + move.y) }));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSample(cursor);
    }
  }

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`Screenshot. Move the picker with the arrow keys (hold Shift for fine steps) and press Enter to pick the ${picking} colour.`}
      onKeyDown={onKeyDown}
      onFocus={() => setShowCursor(true)}
      className="relative overflow-hidden rounded-xl border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob URL; next/image adds nothing here */}
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const point = {
            x: clamp((e.clientX - rect.left) / rect.width),
            y: clamp((e.clientY - rect.top) / rect.height),
          };
          setCursor(point);
          setShowCursor(true);
          onSample(point);
        }}
        className="block w-full cursor-crosshair"
      />
      {showCursor && (
        <span
          aria-hidden
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_#000]"
          style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
        />
      )}
    </div>
  );
}
