# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server at localhost:3000
npm run build    # production build
npm run lint     # eslint
```

No test suite configured yet.

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- Geist font (sans + mono) loaded via `next/font/google`

## Architecture

App Router layout: `src/app/layout.tsx` is the root shell (font vars, body flex column). Pages go in `src/app/`. No API routes, no data layer yet — this is a blank slate.

Tailwind v4 uses PostCSS plugin (`@tailwindcss/postcss`), not the legacy `tailwind.config.js` approach. CSS custom properties for fonts are set via `--font-geist-sans` / `--font-geist-mono` variables.

## Prosjekt

Se [docs/friluftskompis.md](docs/friluftskompis.md) for prosjektbeskrivelse, scenarioer, brukerreise og MVP-definisjon.
