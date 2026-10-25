import ContrastChecker from "@/components/ContrastChecker";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          Design Copilot
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Check colour contrast against WCAG
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Pick a text and background colour to see if they meet accessibility standards, and get
          the nearest colour that passes without losing your brand&apos;s hue.
        </p>
      </header>
      <ContrastChecker />
    </main>
  );
}
