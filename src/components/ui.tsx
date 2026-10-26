import type { ReactNode } from "react";

export function Card({ title, aside, children }: { title?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}

export type Tone = "pass" | "warn" | "fail" | "neutral";

const TONES: Record<Tone, string> = {
  pass: "bg-pass-bg text-pass",
  warn: "bg-warn-bg text-warn",
  fail: "bg-fail-bg text-fail",
  neutral: "bg-surface text-muted border border-line",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function ColorChip({ hex }: { hex: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="h-5 w-5 shrink-0 rounded-md border border-line" style={{ background: hex }} />
      <span className="font-mono text-xs">{hex}</span>
    </span>
  );
}

/**
 * Shows a colour pair as "Aa" drawn in SVG. It is a picture of the pair, not
 * text to read, and drawing it keeps the deliberately failing samples out of
 * the page's own contrast audit.
 */
export function PairSwatch({ fg, bg }: { fg: string; bg: string }) {
  return (
    <svg aria-hidden width="56" height="40" viewBox="0 0 56 40" className="shrink-0 rounded-lg border border-line">
      <rect width="56" height="40" fill={bg} />
      <text x="28" y="26" textAnchor="middle" fontSize="15" fontWeight="600" fill={fg}>
        Aa
      </text>
    </svg>
  );
}

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
