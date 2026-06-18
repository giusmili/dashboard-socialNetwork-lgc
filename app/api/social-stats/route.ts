import { NextResponse } from "next/server";
import { readHistory, buildTikTokTrend } from "@/lib/tiktok-history";

/* ────────────────────────────────────────────────────────────
   GET /api/social-stats — contrat décrit dans CLAUDE.md / le composant.
   TikTok est branché sur l'historique réel (voir lib/tiktok-history.ts).
   LinkedIn et Instagram restent simulés en attendant leur intégration.
   ──────────────────────────────────────────────────────────── */

interface SeriesPoint {
  date: string;
  value: number;
}

interface NetworkStats {
  followers: number;
  followersDelta: number;
  followersSeries: SeriesPoint[];
  reach: number;
  reachDelta: number;
  reachLabel: string;
}

function placeholderSeries(base: number, dailyGrowth: number, volatility: number): SeriesPoint[] {
  const days: SeriesPoint[] = [];
  let v = base;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    v += dailyGrowth + (Math.random() - 0.5) * volatility;
    days.push({
      date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      value: Math.round(v),
    });
  }
  return days;
}

export async function GET() {
  const history = await readHistory();
  const trend = buildTikTokTrend(history);

  const tiktok: NetworkStats = trend
    ? { ...trend, reachLabel: "Vues" }
    : {
        followers: 0,
        followersDelta: 0,
        followersSeries: [],
        reach: 0,
        reachDelta: 0,
        reachLabel: "Vues",
      };

  return NextResponse.json({
    linkedin: {
      followers: 4820,
      followersDelta: 3.2,
      reach: 38400,
      reachDelta: 12.5,
      reachLabel: "Impressions",
      followersSeries: placeholderSeries(4600, 7, 14),
    },
    tiktok,
    instagram: {
      followers: 6340,
      followersDelta: -1.4,
      reach: 22800,
      reachDelta: 5.8,
      reachLabel: "Reach",
      followersSeries: placeholderSeries(6400, -3, 18),
    },
  });
}
