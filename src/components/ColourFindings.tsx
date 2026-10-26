import { type RGB, checkContrast, requiredRatio, suggestForeground, toHex } from "@/lib/contrast";
import type { Pair, Swatch } from "@/lib/palette";
import { Badge, Card, ColorChip, PairSwatch, type Tone } from "./ui";

export type Samples = { text: RGB | null; background: RGB | null };

const VERDICT: Record<Pair["verdict"], { label: string; tone: Tone }> = {
  fail: { label: "Fails", tone: "fail" },
  "large-only": { label: "Large text only", tone: "warn" },
  pass: { label: "Passes", tone: "pass" },
};

const floor2 = (n: number) => (Math.floor(n * 100) / 100).toFixed(2);

export function Picks({
  samples,
  picking,
  onPick,
}: {
  samples: Samples;
  picking: keyof Samples;
  onPick: (key: keyof Samples) => void;
}) {
  const { text, background } = samples;
  const result = text && background ? checkContrast(text, background, { px: 16, bold: false }) : null;
  const fix =
    result && !result.passes.AA && text && background
      ? suggestForeground(text, background, requiredRatio("AA", false))
      : null;

  return (
    <Card title="Check a specific spot">
      <div className="flex flex-wrap gap-2">
        {(["text", "background"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onPick(key)}
            aria-pressed={picking === key}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm aria-pressed:border-accent aria-pressed:ring-1 aria-pressed:ring-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="capitalize text-muted">{key}</span>
            {samples[key] ? <ColorChip hex={toHex(samples[key])} /> : <span>Not set</span>}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="mt-3 text-sm">
        {result ? (
          <>
            <p>
              <span className="text-2xl font-semibold">{floor2(result.ratio)}:1</span>{" "}
              {result.passes.AA
                ? "passes AA for body text."
                : result.ratio >= 3
                  ? "passes for large text only (24px+, or 19px+ bold)."
                  : "fails AA."}
            </p>
            {fix && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-muted">
                Closest passing text colour: <ColorChip hex={fix} />
              </p>
            )}
          </>
        ) : (
          <p className="text-muted">
            Pick the <strong className="text-foreground">{picking}</strong> colour: click a letter in the screenshot,
            then the area behind it.
          </p>
        )}
      </div>
    </Card>
  );
}

export function Palette({ palette }: { palette: Swatch[] }) {
  return (
    <Card title="Palette found">
      <ul className="flex flex-wrap gap-3">
        {palette.map((s) => (
          <li key={s.hex} className="flex flex-col items-center gap-1">
            <span aria-hidden className="h-10 w-10 rounded-lg border border-line" style={{ background: s.hex }} />
            <span className="font-mono text-[11px]">{s.hex}</span>
            <span className="text-xs text-muted">{s.share < 0.01 ? "<1%" : `${Math.round(s.share * 100)}%`}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PairList({ pairs }: { pairs: Pair[] }) {
  const failing = pairs.filter((p) => p.verdict !== "pass").length;
  return (
    <Card
      title="Colours on the main backgrounds"
      aside={
        pairs.length > 0 && (
          <span className="text-xs text-muted">
            {failing} of {pairs.length} not safe for body text
          </span>
        )
      }
    >
      <p className="mb-3 text-xs text-muted">
        Some may be borders, icons or edge smoothing rather than text. The AI review checks which ones matter.
      </p>
      <ul
        tabIndex={0}
        aria-label="Colour pairs, worst contrast first"
        className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {pairs.map((pair) => (
          <li key={pair.fg.hex + pair.bg.hex} className="flex items-center gap-3">
            <PairSwatch fg={pair.fg.hex} bg={pair.bg.hex} />
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-mono">
                {pair.fg.hex} on {pair.bg.hex}
              </p>
              <p className="text-muted">{floor2(pair.ratio)}:1</p>
            </div>
            <Badge tone={VERDICT[pair.verdict].tone}>{VERDICT[pair.verdict].label}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
