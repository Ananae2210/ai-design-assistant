import ContrastChecker from "@/components/ContrastChecker";
import ScreenshotAnalyzer from "@/components/ScreenshotAnalyzer";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 py-12 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          Design Copilot
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Accessibility checks for your designs
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Upload a screen to find colour pairs that fail WCAG, or test two colours directly and get
          the nearest colour that passes without losing your brand&apos;s hue.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Check a screenshot</h2>
        <ScreenshotAnalyzer />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Check two colours</h2>
        <ContrastChecker />
      </div>
    </main>
  );
}
