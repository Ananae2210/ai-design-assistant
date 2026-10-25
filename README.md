# Design Copilot

An AI design critique and accessibility assistant. Upload a screen, get WCAG issues, hierarchy feedback and concrete fixes.

## Status

- [x] WCAG 2.2 colour contrast checker with "closest passing colour" fix (free, runs in the browser)
- [ ] Screenshot upload + automated checks (contrast sampling, text size, tap targets)
- [ ] AI critique of hierarchy, layout and copy (Claude, small model by default)
- [ ] Figma link import (Figma REST API)
- [ ] Saved reports and login (Supabase)

## Cost approach

Rule-based checks run in our own code at no cost. Only judgment calls (hierarchy, layout, copy) go to the AI, using a small model, resized images, cached results and a per-user daily cap. Hosting, database and monitoring use free tiers.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Command             | What it does                 |
| ------------------- | ---------------------------- |
| `npm test`          | Unit tests (Vitest)          |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | TypeScript, no emit          |
| `npm run build`     | Production build             |

CI runs all four on every push and pull request (`.github/workflows/ci.yml`).

## Project layout

```
src/
  app/                    Next.js App Router pages
  components/             UI components
  lib/contrast/           WCAG maths: luminance, ratios, large-text rules, colour fixes (+ tests)
```

## Tech stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, GitHub Actions.
