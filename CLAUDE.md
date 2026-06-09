# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run lint     # ESLint
npx tsc --noEmit # type-check without emitting
```

## Project Overview

Next.js 15 app (App Router, TypeScript, Tailwind CSS) — a social media monitoring dashboard for **La Grande Classe** (@lagrandeclasse) across LinkedIn, TikTok, and Instagram.

The main component lives at `components/lgc-social-dashboard.tsx` and is rendered directly by `app/page.tsx`.

## Architecture

The component is intentionally self-contained in a single file with four layers:

1. **Types** — `NetworkId`, `SeriesPoint`, `NetworkStats`, `SocialStats`, `NetworkMeta`. These form the contract between the UI and the future API route.

2. **Config** — `NETWORKS` object maps each `NetworkId` to display metadata (name, brand color, accent color).

3. **Data layer** — `fetchSocialStats()` currently returns simulated data with a 600 ms delay. **To connect real data**, replace the function body with:
   ```ts
   const res = await fetch("/api/social-stats");
   return (await res.json()) as SocialStats;
   ```
   The expected API response shape is `Record<NetworkId, NetworkStats>`.

4. **UI components** — `Delta`, `StatTile`, `NetworkCard`, `ComparativeChart`, `TotalsBar`, and the default export `Dashboard`. All are co-located in the same file.

## Key Conventions

- UI text is in **French** (`fr-FR` locale for number/date formatting).
- `reachLabel` per network distinguishes the metric name: "Impressions" (LinkedIn), "Vues" (TikTok), "Reach" (Instagram).
- `followersDelta` and `reachDelta` are **percentage** values (positive = growth, negative = decline).
- The 30-day follower time series (`followersSeries`) drives the sparkline inside each `NetworkCard`.
- The `TotalsBar` hard-codes TikTok as "Réseau en croissance" — update this to be dynamic once real data is wired.

## Specifications

The full cahier des charges is at `cdc/cahier-des-charges-social-network-share.docx`.
