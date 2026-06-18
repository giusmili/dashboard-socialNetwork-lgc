import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/* ────────────────────────────────────────────────────────────
   HISTORIQUE TIKTOK — stocké en JSON local (data/tiktok-history.json)
   Un relevé par jour (followers + vues cumulées) permet de calculer
   de vraies tendances : delta sur 7/30 jours, comparaison de période.

   ⚠️ Sur un déploiement serverless (Vercel...), le filesystem n'est
   pas persistant entre invocations : ce stockage convient en dev
   local ou sur un serveur Node long-running (VPS, self-host).
   ──────────────────────────────────────────────────────────── */

export interface TikTokSnapshot {
  date: string; // ISO yyyy-mm-dd
  followers: number;
  views: number; // vues vidéo cumulées (lifetime)
}

const HISTORY_PATH = path.join(process.cwd(), "data", "tiktok-history.json");
const MAX_HISTORY_DAYS = 95; // un peu plus de 90j pour pouvoir comparer deux fenêtres de 30j

export async function readHistory(): Promise<TikTokSnapshot[]> {
  try {
    const raw = await readFile(HISTORY_PATH, "utf-8");
    return JSON.parse(raw) as TikTokSnapshot[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function appendSnapshot(snapshot: TikTokSnapshot): Promise<TikTokSnapshot[]> {
  const history = await readHistory();
  const withoutToday = history.filter((s) => s.date !== snapshot.date);
  const updated = [...withoutToday, snapshot]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_HISTORY_DAYS);

  await mkdir(path.dirname(HISTORY_PATH), { recursive: true });
  await writeFile(HISTORY_PATH, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

/** Trouve le relevé le plus proche (et antérieur ou égal) à `daysAgo` jours avant le dernier relevé. */
function findSnapshotDaysAgo(history: TikTokSnapshot[], daysAgo: number): TikTokSnapshot | null {
  if (history.length === 0) return null;
  const latestDate = new Date(history[history.length - 1].date);
  const target = new Date(latestDate);
  target.setDate(target.getDate() - daysAgo);

  let best: TikTokSnapshot | null = null;
  for (const s of history) {
    if (new Date(s.date) <= target) best = s;
  }
  return best ?? history[0];
}

export interface TikTokTrend {
  followers: number;
  followersDelta: number;
  followersSeries: { date: string; value: number }[];
  reach: number;
  reachDelta: number;
}

/**
 * Calcule une vraie tendance à partir de l'historique :
 * - followersDelta : variation des abonnés sur 30 jours
 * - reach / reachDelta : vues gagnées sur les 30 derniers jours, comparées
 *   aux 30 jours précédents (diff de compteurs cumulés, pas juste le delta brut)
 */
export function buildTikTokTrend(history: TikTokSnapshot[]): TikTokTrend | null {
  if (history.length === 0) return null;

  const latest = history[history.length - 1];
  const minus30 = findSnapshotDaysAgo(history, 30);
  const minus60 = findSnapshotDaysAgo(history, 60);

  const followersDelta =
    minus30 && minus30.followers > 0
      ? Number((((latest.followers - minus30.followers) / minus30.followers) * 100).toFixed(1))
      : 0;

  const currentPeriodViews = minus30 ? latest.views - minus30.views : latest.views;
  const previousPeriodViews = minus30 && minus60 ? minus30.views - minus60.views : 0;
  const reachDelta =
    previousPeriodViews > 0
      ? Number((((currentPeriodViews - previousPeriodViews) / previousPeriodViews) * 100).toFixed(1))
      : 0;

  const followersSeries = history.slice(-30).map((s) => ({
    date: new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    value: s.followers,
  }));

  return {
    followers: latest.followers,
    followersDelta,
    followersSeries,
    reach: Math.max(currentPeriodViews, 0),
    reachDelta,
  };
}
