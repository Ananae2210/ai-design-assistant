"use client";

import { useRef, useState } from "react";
import { type RGB, checkContrast, requiredRatio, suggestForeground, toHex } from "@/lib/contrast";
import { type Pair, type Swatch, extractPalette, ratePairs } from "@/lib/palette";

// Kept near full size so sampling a thin letter isn't blurred by downscaling.
const MAX_WIDTH = 2000;
// Palette extraction reads about this many pixels, whatever the image size.
const PALETTE_SAMPLE = 400_000;

const VERDICT_STYLE: Record<Pair["verdict"], { label: string; className: string }> = {
  fail: { label: "Fails", className: "bg-fail-bg text-fail" },
  "large-only": { label: "Large text only", className: "bg-warn-bg text-warn" },
  pass: { label: "Passes", className: "bg-pass-bg text-pass" },
};

type Samples = { text: RGB | null; background: RGB | null };

function Chip({ hex }: { hex: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="h-6 w-6 rounded-md border border-line" style={{ background: hex }} />
      <span className="font-mono text-xs">{hex}</span>
    </span>
  );
}

function PairPreview({ pair }: { pair: Pair }) {
  return (
    <span
      aria-hidden
      className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-line text-sm font-semibold"
      style={{ background: pair.bg.hex, color: pair.fg.hex }}
    >
      Aa
    </span>
  );
}

function pixelAt(ctx: CanvasRenderingContext2D, x: number, y: number): RGB {
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
  return { r, g, b };
}

/**
 * Clicks rarely land on a letter's solid core, and edge pixels are blended with
 * the background. Look in a small window and take the pixel that differs most
 * from the window's average, which is the true ink colour.
 */
function glyphColor(ctx: CanvasRenderingContext2D, x: number, y: number, radius = 3): RGB {
  const size = radius * 2 + 1;
  const { data } = ctx.getImageData(x - radius, y - radius, size, size);
  const count = data.length / 4;
  const mean = { r: 0, g: 0, b: 0 };
  for (let i = 0; i < data.length; i += 4) {
    mean.r += data[i] / count;
    mean.g += data[i + 1] / count;
    mean.b += data[i + 2] / count;
  }
  let best = pixelAt(ctx, x, y);
  let bestDistance = -1;
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.hypot(data[i] - mean.r, data[i + 1] - mean.g, data[i + 2] - mean.b);
    if (d > bestDistance) {
      bestDistance = d;
      best = { r: data[i], g: data[i + 1], b: data[i + 2] };
    }
  }
  return best;
}

export default function ScreenshotAnalyzer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [palette, setPalette] = useState<Swatch[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [samples, setSamples] = useState<Samples>({ text: null, background: null });
  const [picking, setPicking] = useState<keyof Samples>("text");

  function load(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image. Try a PNG, JPG or WebP screenshot.");
      return;
    }
    setError("");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });
      if (!canvas || !ctx) return;
      const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const stride = Math.max(1, Math.floor((canvas.width * canvas.height) / PALETTE_SAMPLE));
      setPalette(extractPalette(data, { max: 10, minShare: 0.001, stride }));
      setSamples({ text: null, background: null });
      setPicking("text");
    };
    img.onerror = () => setError("We couldn't read that image.");
    img.src = url;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(url);
    setFileName(file.name);
  }

  function sample(e: React.MouseEvent<HTMLImageElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    setSamples((s) => ({ ...s, [picking]: picking === "text" ? glyphColor(ctx, x, y) : pixelAt(ctx, x, y) }));
    setPicking((p) => (p === "text" ? "background" : "text"));
  }

  const pairs = ratePairs(palette);
  const failing = pairs.filter((p) => p.verdict !== "pass").length;
  const sampled =
    samples.text && samples.background
      ? checkContrast(samples.text, samples.background, { px: 16, bold: false })
      : null;
  const sampledFix =
    sampled && !sampled.passes.AA && samples.text && samples.background
      ? suggestForeground(samples.text, samples.background, requiredRatio("AA", false))
      : null;

  return (
    <section className="flex flex-col gap-6">
      <canvas ref={canvasRef} hidden />

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          load(e.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-accent ${
          dragging ? "border-accent bg-accent/5" : "border-line bg-card hover:border-accent"
        }`}
      >
        <span className="text-base font-semibold">
          {imageUrl ? "Drop another screenshot or click to replace" : "Drop a screenshot here or click to upload"}
        </span>
        <span className="text-sm text-muted">
          PNG, JPG or WebP. It stays on your device and is never uploaded.
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => load(e.target.files?.[0])}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}

      {imageUrl && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-sm text-muted">{fileName}</p>
              <p className="text-sm font-medium">
                Click to pick the{" "}
                <span className="text-accent">{picking === "text" ? "text" : "background"}</span> colour
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image adds nothing here */}
            <img
              src={imageUrl}
              alt="Uploaded screenshot. Click to sample colours."
              onClick={sample}
              className="max-h-[640px] w-full cursor-crosshair rounded-xl border border-line object-contain object-top"
            />
          </div>

          <div className="flex flex-col gap-4" aria-live="polite">
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="text-sm font-semibold">Your picks</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {(["text", "background"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPicking(key)}
                    aria-pressed={picking === key}
                    className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm aria-pressed:border-accent aria-pressed:ring-1 aria-pressed:ring-accent"
                  >
                    <span className="capitalize text-muted">{key}</span>
                    {samples[key] ? <Chip hex={toHex(samples[key])} /> : <span>Not set</span>}
                  </button>
                ))}
              </div>
              {sampled ? (
                <p className="mt-4 text-sm">
                  <span className="text-2xl font-semibold">
                    {(Math.floor(sampled.ratio * 100) / 100).toFixed(2)}:1
                  </span>{" "}
                  {sampled.passes.AA
                    ? "passes AA for body text."
                    : sampled.ratio >= 3
                      ? "passes for large text only (24px+, or 19px+ bold)."
                      : "fails AA."}
                  {sampledFix && (
                    <span className="mt-2 flex items-center gap-2 text-muted">
                      Try <Chip hex={sampledFix} /> for the text instead.
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Click a letter in the screenshot, then the area behind it.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="text-sm font-semibold">Palette found</p>
              <ul className="mt-3 flex flex-wrap gap-3">
                {palette.map((s) => (
                  <li key={s.hex} className="flex flex-col items-center gap-1">
                    <span
                      className="h-10 w-10 rounded-lg border border-line"
                      style={{ background: s.hex }}
                      title={s.hex}
                    />
                    <span className="text-xs text-muted">
                      {s.share < 0.01 ? "<1%" : `${Math.round(s.share * 100)}%`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="text-sm font-semibold">
                Colours on the main background{pairs.length > 0 && (
                  <span className="font-normal text-muted">
                    {" "}· {failing} of {pairs.length} not safe for body text
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">
                Some of these may be borders, icons or edge smoothing rather than text. Click a
                spot in the screenshot to check a specific pair.
              </p>
              <ul className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                {pairs.map((pair) => {
                  const style = VERDICT_STYLE[pair.verdict];
                  return (
                    <li key={pair.fg.hex + pair.bg.hex} className="flex items-center gap-3">
                      <PairPreview pair={pair} />
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-mono">
                          {pair.fg.hex} on {pair.bg.hex}
                        </p>
                        <p className="text-muted">{pair.ratio.toFixed(2)}:1</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
                        {style.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
