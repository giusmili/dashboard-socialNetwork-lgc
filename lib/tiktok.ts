/* ────────────────────────────────────────────────────────────
   CLIENT TIKTOK BUSINESS API
   Doc : https://business-api.tiktok.com/portal/docs
   Authentification : compte TikTok Business @lagrandeclasse lié à une
   app "TikTok for Developers", scope d'accès au compte (pas le scope
   Ads). Le token n'expire pas indéfiniment : prévoir un refresh si
   TikTok renvoie une erreur d'auth.

   ⚠️ Les noms de champs ci-dessous (FIELDS / parseBusinessAccount)
   sont à vérifier contre la doc TikTok au moment de l'intégration :
   TikTok fait évoluer son schéma de réponse business/get régulièrement.
   Ajuste FIELDS et le parsing si la réponse réelle diffère.
   ──────────────────────────────────────────────────────────── */

const API_BASE = process.env.TIKTOK_BUSINESS_API_BASE ?? "https://business-api.tiktok.com/open_api/v1.3";
const FIELDS = ["followers_count", "profile_views", "video_views"];

export interface TikTokAccountSnapshot {
  followers: number;
  views: number;
}

export class TikTokConfigError extends Error {}

export async function fetchTikTokAccountSnapshot(): Promise<TikTokAccountSnapshot> {
  const accessToken = process.env.TIKTOK_BUSINESS_ACCESS_TOKEN;
  const businessId = process.env.TIKTOK_BUSINESS_ID;

  if (!accessToken || !businessId) {
    throw new TikTokConfigError(
      "TIKTOK_BUSINESS_ACCESS_TOKEN et TIKTOK_BUSINESS_ID doivent être définis (voir .env.local.example)"
    );
  }

  const url = new URL(`${API_BASE}/business/get/`);
  url.searchParams.set("business_id", businessId);
  url.searchParams.set("fields", JSON.stringify(FIELDS));

  const res = await fetch(url, {
    headers: { "Access-Token": accessToken },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`TikTok Business API a répondu ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return parseBusinessAccount(json);
}

function parseBusinessAccount(json: unknown): TikTokAccountSnapshot {
  const data = (json as { data?: Record<string, unknown> })?.data ?? {};

  const followers = Number(data["followers_count"] ?? data["follower_count"] ?? 0);
  const views = Number(data["video_views"] ?? data["profile_views"] ?? 0);

  if (!Number.isFinite(followers) || !Number.isFinite(views)) {
    throw new Error("Réponse TikTok Business API inattendue : impossible d'en extraire followers/views");
  }

  return { followers, views };
}
