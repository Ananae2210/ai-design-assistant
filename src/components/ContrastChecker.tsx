"use client";

import { useId, useState } from "react";
import {
  checkContrast,
  parseColor,
  requiredRatio,
  suggestForeground,
  toHex,
} from "@/lib/contrast";

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const id = useId();
  const parsed = parseColor(value);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={parsed ? toHex(parsed) : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent p-1"
        />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-invalid={!parsed}
          className="h-11 w-full rounded-lg border border-line bg-surface px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent aria-[invalid=true]:border-danger"
        />
      </div>
      {!parsed && (
        <p className="text-xs text-danger">Use a hex code like #1a2b3c or rgb(26, 43, 60).</p>
      )}
    </div>
  );
}

function Verdict({ label, detail, pass }: { label: string; detail: string; pass: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted">{detail}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          pass ? "bg-pass-bg text-pass" : "bg-fail-bg text-fail"
        }`}
      >
        {pass ? "Pass" : "Fail"}
      </span>
    </li>
  );
}

export default function ContrastChecker() {
  const [fg, setFg] = useState("#ff8a65");
  const [bg, setBg] = useState("#ffffff");
  const [px, setPx] = useState(16);
  const [bold, setBold] = useState(false);

  const fgRgb = parseColor(fg);
  const bgRgb = parseColor(bg);
  const result = fgRgb && bgRgb ? checkContrast(fgRgb, bgRgb, { px, bold }) : null;
  const target = result ? requiredRatio("AA", result.large) : 4.5;
  const fix =
    result && fgRgb && bgRgb && !result.passes.AA ? suggestForeground(fgRgb, bgRgb, target) : null;

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6 rounded-2xl border border-line bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label="Text colour" value={fg} onChange={setFg} />
          <ColorField label="Background colour" value={bg} onChange={setBg} />
        </div>

        <button
          type="button"
          onClick={() => {
            setFg(bg);
            setBg(fg);
          }}
          className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Swap colours
        </button>

        <div className="flex flex-wrap items-end gap-6">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Font size: {px}px
            <input
              type="range"
              min={10}
              max={48}
              value={px}
              onChange={(e) => setPx(Number(e.target.value))}
              className="w-48 accent-accent"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={bold}
              onChange={(e) => setBold(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Bold
          </label>
        </div>

        <div
          className="rounded-xl border border-line p-6"
          style={{ background: bgRgb ? toHex(bgRgb) : undefined, color: fgRgb ? toHex(fgRgb) : undefined }}
        >
          <p style={{ fontSize: px, fontWeight: bold ? 700 : 400, lineHeight: 1.4 }}>
            Your order is on its way and will arrive in 25 minutes.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4" aria-live="polite">
        {result ? (
          <>
            <div className="rounded-2xl border border-line bg-card p-6">
              <p className="text-sm text-muted">Contrast ratio</p>
              <p className="text-5xl font-semibold tracking-tight">
                {(Math.floor(result.ratio * 100) / 100).toFixed(2)}
                <span className="text-2xl text-muted">:1</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                Treated as {result.large ? "large" : "normal"} text under WCAG 2.2.
              </p>
            </div>

            <ul className="flex flex-col gap-2">
              <Verdict
                label="AA"
                detail={`Needs ${requiredRatio("AA", result.large)}:1 — the usual legal and industry baseline`}
                pass={result.passes.AA}
              />
              <Verdict
                label="AAA"
                detail={`Needs ${requiredRatio("AAA", result.large)}:1 — enhanced contrast`}
                pass={result.passes.AAA}
              />
              <Verdict
                label="Icons and UI parts"
                detail="Needs 3:1 — borders, icons, focus rings"
                pass={result.passes.nonText}
              />
            </ul>

            {fix && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-10 w-10 rounded-lg border border-line"
                    style={{ background: fix }}
                  />
                  <div>
                    <p className="text-sm font-semibold">Closest passing text colour</p>
                    <p className="font-mono text-xs text-muted">
                      {fix} keeps the same hue and reaches AA
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFg(fix)}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Apply
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="rounded-2xl border border-line bg-card p-6 text-sm text-muted">
            Enter two valid colours to see the result.
          </p>
        )}
      </div>
    </section>
  );
}
