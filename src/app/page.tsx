import ContrastChecker from "@/components/ContrastChecker";
import ScreenshotWorkspace from "@/components/ScreenshotWorkspace";

const REPO = "https://github.com/Ananae2210/ai-design-assistant";

export default function Home() {
  return (
    <>
      <header className="border-b border-line">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <span className="text-sm font-semibold tracking-wide">
            <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-accent" />
            AI Design Assistant
          </span>
          <a href={REPO} className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
            Code on GitHub
          </a>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 py-12 sm:px-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Review any screen for accessibility and design quality
            </h1>
            <p className="max-w-2xl text-lg text-muted">
              Drop in a screenshot. Colour contrast is measured against WCAG 2.2 straight away, then an AI review
              covers hierarchy, layout, copy and the issues rules can&apos;t catch, with a fix for each.
            </p>
          </div>
          <ScreenshotWorkspace />
        </div>

        <section aria-labelledby="two-colours-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="two-colours-heading" className="text-2xl font-semibold tracking-tight">
              Check two colours
            </h2>
            <p className="text-sm text-muted">
              Test a pair from your palette and get the closest colour that passes, keeping the same hue.
            </p>
          </div>
          <ContrastChecker />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-8">
          <span>Built by Ananae with Next.js and Claude.</span>
          <span>Screenshots are never stored.</span>
        </div>
      </footer>
    </>
  );
}
