"use client";

import { useRef, useState } from "react";
import type { CritiqueRequest } from "@/lib/critique/schema";
import type { CritiqueResponseBody } from "@/lib/critique/handler";
import { fitWithin } from "@/lib/image/fit";
import { type Swatch, extractPalette, pickInkColor, ratePairs } from "@/lib/palette";
import { buildMarkdownReport } from "@/lib/report/markdown";
import AiReview, { type ReviewState } from "./AiReview";
import { Palette, PairList, Picks, type Samples } from "./ColourFindings";
import Dropzone from "./Dropzone";
import Sampler from "./Sampler";
import { buttonSecondary } from "./ui";

// Kept near full size so sampling a thin letter isn't blurred by downscaling.
const MAX_WIDTH = 2000;
// Palette extraction reads about this many pixels, whatever the image size.
const PALETTE_SAMPLE = 400_000;
// Pixels either side of a click searched for a letter's solid ink colour.
const SAMPLE_RADIUS = 3;

/** A copy of the image sized for the AI: JPEG on white, longest edge 1568px. */
function imageForReview(source: HTMLCanvasElement): CritiqueRequest["image"] {
  const { width, height } = fitWithin(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return { mediaType: "image/jpeg", data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1] };
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScreenshotWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [palette, setPalette] = useState<Swatch[]>([]);
  const [error, setError] = useState("");
  const [samples, setSamples] = useState<Samples>({ text: null, background: null });
  const [picking, setPicking] = useState<keyof Samples>("text");
  const [context, setContext] = useState("");
  const [review, setReview] = useState<ReviewState>({ status: "idle" });

  const pairs = ratePairs(palette);

  function load(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("That file isn't a supported image. Try a PNG, JPG or WebP screenshot.");
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const stride = Math.max(1, Math.floor((canvas.width * canvas.height) / PALETTE_SAMPLE));
      setPalette(extractPalette(data, { max: 10, minShare: 0.001, stride }));
      setSamples({ text: null, background: null });
      setPicking("text");
      setReview({ status: "idle" });
      setImageUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
      setFileName(file.name);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("We couldn't read that image. It may be damaged or in an unusual format.");
    };
    img.src = url;
  }

  function sample({ x, y }: { x: number; y: number }) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const px = Math.min(canvas.width - 1, Math.floor(x * canvas.width));
    const py = Math.min(canvas.height - 1, Math.floor(y * canvas.height));
    const r = picking === "text" ? SAMPLE_RADIUS : 0;
    const colour = pickInkColor(ctx.getImageData(px - r, py - r, r * 2 + 1, r * 2 + 1).data);
    if (!colour) return;
    setSamples((s) => ({ ...s, [picking]: colour }));
    setPicking((p) => (p === "text" ? "background" : "text"));
  }

  async function runReview() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReview({ status: "loading" });
    const body: CritiqueRequest = {
      image: imageForReview(canvas),
      context,
      findings: pairs
        .filter((p) => p.verdict !== "pass")
        .slice(0, 30)
        .map((p) => ({ fg: p.fg.hex, bg: p.bg.hex, ratio: p.ratio, verdict: p.verdict })),
    };
    try {
      const res = await fetch("/api/critique", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as CritiqueResponseBody;
      setReview(json.ok ? { status: "done", result: json } : { status: "error", message: json.message });
    } catch {
      setReview({ status: "error", message: "Couldn't reach the review service. Check your connection and try again." });
    }
  }

  function exportReport() {
    const critique = review.status === "done" ? review.result.critique : null;
    const md = buildMarkdownReport({ fileName, date: new Date(), pairs, critique });
    download(`${fileName.replace(/\.[^.]+$/, "") || "screen"}-design-review.md`, md);
  }

  return (
    <div className="flex flex-col gap-10">
      <canvas ref={canvasRef} hidden />
      <div className="flex flex-col gap-3">
        <Dropzone hasImage={Boolean(imageUrl)} onFile={load} />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      {imageUrl && (
        <>
          <section aria-labelledby="checks-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="checks-heading" className="text-2xl font-semibold tracking-tight">
                  Automated colour checks
                </h2>
                <p className="text-sm text-muted">
                  {fileName} · {palette.length} colours found · measured against WCAG 2.2 AA
                </p>
              </div>
              <button type="button" onClick={exportReport} className={buttonSecondary}>
                Download report (.md)
              </button>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="lg:sticky lg:top-6 lg:self-start">
                <Sampler imageUrl={imageUrl} picking={picking} onSample={sample} />
              </div>
              <div className="flex flex-col gap-4">
                <Picks samples={samples} picking={picking} onPick={setPicking} />
                <Palette palette={palette} />
                <PairList pairs={pairs} />
              </div>
            </div>
          </section>

          <AiReview state={review} context={context} onContextChange={setContext} onRun={runReview} />
        </>
      )}
    </div>
  );
}

