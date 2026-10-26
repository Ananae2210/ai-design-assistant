"use client";

import { useId, useState } from "react";
import type { CritiqueResponseBody } from "@/lib/critique/handler";
import { SEVERITIES, type Severity } from "@/lib/critique/schema";
import { Badge, Card, type Tone, buttonPrimary } from "./ui";

export type ReviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: Extract<CritiqueResponseBody, { ok: true }> };

const SEVERITY_TONE: Record<Severity, Tone> = { critical: "fail", major: "warn", minor: "neutral" };

const wcagUrl = (sc: string) => `https://www.w3.org/WAI/WCAG22/Understanding/#:~:text=${encodeURIComponent(sc)}`;

export default function AiReview({
  state,
  context,
  onContextChange,
  onRun,
}: {
  state: ReviewState;
  context: string;
  onContextChange: (value: string) => void;
  onRun: () => void;
}) {
  const contextId = useId();
  const [filter, setFilter] = useState<Severity | "all">("all");
  const loading = state.status === "loading";

  return (
    <section aria-labelledby="ai-review-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="ai-review-heading" className="text-2xl font-semibold tracking-tight">
          AI design review
        </h2>
        <p className="text-sm text-muted">
          Hierarchy, layout, consistency, copy and the accessibility issues rules can&apos;t catch, with a fix for each.
        </p>
      </div>

      <Card>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            onRun();
          }}
        >
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor={contextId} className="text-sm font-medium">
              What is this screen? <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={contextId}
              value={context}
              maxLength={500}
              onChange={(e) => onContextChange(e.target.value)}
              placeholder="e.g. Checkout page of a food delivery app, for first-time users"
              className="h-11 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <button type="submit" disabled={loading} className={`${buttonPrimary} h-11`}>
            {loading ? "Reviewing…" : state.status === "done" ? "Review again" : "Run AI review"}
          </button>
        </form>
      </Card>

      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <Card>
            <p className="text-sm">Reviewing the screen. This can take up to a minute.</p>
            <div className="mt-4 flex flex-col gap-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          </Card>
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-2xl border border-danger/40 bg-fail-bg p-4 text-sm text-fail">
            {state.message}
          </div>
        )}

        {state.status === "done" && (
          <Results result={state.result} filter={filter} onFilter={setFilter} />
        )}
      </div>
    </section>
  );
}

function Results({
  result,
  filter,
  onFilter,
}: {
  result: Extract<CritiqueResponseBody, { ok: true }>;
  filter: Severity | "all";
  onFilter: (f: Severity | "all") => void;
}) {
  const { critique } = result;
  const counts = Object.fromEntries(
    SEVERITIES.map((s) => [s, critique.issues.filter((i) => i.severity === s).length]),
  ) as Record<Severity, number>;
  const shown = filter === "all" ? critique.issues : critique.issues.filter((i) => i.severity === filter);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Summary">
        <p className="text-sm leading-relaxed">{critique.summary}</p>
        {critique.strengths.length > 0 && (
          <>
            <h4 className="mt-4 text-sm font-semibold">What works</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {critique.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <div role="group" aria-label="Filter issues by severity" className="flex flex-wrap gap-2">
        {(["all", ...SEVERITIES] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => onFilter(f)}
            className="rounded-full border border-line px-3 py-1 text-sm capitalize aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {f} ({f === "all" ? critique.issues.length : counts[f]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted">No issues at this severity.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {shown.map((issue) => (
            <li key={issue.title + issue.location} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEVERITY_TONE[issue.severity]}>
                  <span className="capitalize">{issue.severity}</span>
                </Badge>
                <Badge tone="neutral">
                  <span className="capitalize">{issue.category}</span>
                </Badge>
                {issue.wcag && (
                  <a
                    href={wcagUrl(issue.wcag)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-accent underline-offset-4 hover:underline"
                  >
                    WCAG {issue.wcag}
                  </a>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold">{issue.title}</h3>
              <p className="text-xs text-muted">{issue.location}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
                <dt className="font-semibold">Problem</dt>
                <dd>{issue.problem}</dd>
                <dt className="font-semibold">Fix</dt>
                <dd>{issue.fix}</dd>
              </dl>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-muted">
        Written by AI ({result.model}
        {result.cached ? ", from cache" : `, ${result.usage.inputTokens.toLocaleString()} input and ${result.usage.outputTokens.toLocaleString()} output tokens`}
        ). Check each point against the design before acting on it.
      </p>
    </div>
  );
}
