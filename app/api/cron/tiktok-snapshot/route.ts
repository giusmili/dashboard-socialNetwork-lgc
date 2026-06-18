import { NextRequest, NextResponse } from "next/server";
import { fetchTikTokAccountSnapshot } from "@/lib/tiktok";
import { appendSnapshot } from "@/lib/tiktok-history";

/* ────────────────────────────────────────────────────────────
   Relevé quotidien TikTok — à appeler une fois par jour
   (cron Vercel, GitHub Actions, ou tout planificateur externe)
   avec l'en-tête  Authorization: Bearer <CRON_SECRET>.
   ──────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await fetchTikTokAccountSnapshot();
    const today = new Date().toISOString().slice(0, 10);
    const history = await appendSnapshot({ date: today, ...snapshot });
    return NextResponse.json({ ok: true, snapshotsStored: history.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
