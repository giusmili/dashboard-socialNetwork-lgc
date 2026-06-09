"use client";

import Image from "next/image";
import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  Users, Eye, Heart, TrendingUp, TrendingDown, RefreshCw, ArrowUpRight,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/* ────────────────────────────────────────────────────────────
   TYPES — contrat partagé avec la future route /api/social-stats
   ──────────────────────────────────────────────────────────── */

type NetworkId = "linkedin" | "tiktok" | "instagram";

interface SeriesPoint {
  date: string;
  value: number;
}

interface NetworkStats {
  followers: number;
  followersDelta: number;
  followersSeries: SeriesPoint[];
  /** Portée : impressions (LinkedIn), vues (TikTok) ou reach (Instagram) */
  reach: number;
  reachDelta: number;
  /** Libellé de la métrique de portée pour l'affichage */
  reachLabel: string;
}

type SocialStats = Record<NetworkId, NetworkStats>;

interface NetworkMeta {
  name: string;
  color: string;
  accent: string;
}

/* ──────────────────────── NETWORK ICONS ───────────────────────── */

function LinkedInIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path d="M7.75 9.5H5.5V18H7.75V9.5Z" fill="white" />
      <circle cx="6.625" cy="7" r="1.375" fill="white" />
      <path d="M18.5 12.75C18.5 11 17.25 9.5 15.25 9.5C14.125 9.5 13.25 10 12.75 10.75V9.5H10.5V18H12.75V13.5C12.75 12.5 13.5 11.75 14.5 11.75C15.5 11.75 16.25 12.5 16.25 13.5V18H18.5V12.75Z" fill="white" />
    </svg>
  );
}

function TikTokIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#010101" />
      <path d="M19 8.5C18 8.5 17.1 8.1 16.4 7.5C15.7 6.8 15.3 5.9 15.3 5H12.8V15.4C12.8 16.5 11.9 17.4 10.8 17.4C9.7 17.4 8.8 16.5 8.8 15.4C8.8 14.3 9.7 13.4 10.8 13.4C11 13.4 11.2 13.4 11.4 13.5V11C11.2 11 11 11 10.8 11C8.4 11 6.4 13 6.4 15.4C6.4 17.8 8.4 19.8 10.8 19.8C13.2 19.8 15.2 17.8 15.2 15.4V10.1C16.2 10.8 17.5 11.3 19 11.3V8.5Z" fill="white" />
      <path d="M19 8.5C18 8.5 17.1 8.1 16.4 7.5C15.7 6.8 15.3 5.9 15.3 5H12.8V15.4C12.8 16.5 11.9 17.4 10.8 17.4C9.7 17.4 8.8 16.5 8.8 15.4C8.8 14.3 9.7 13.4 10.8 13.4C11 13.4 11.2 13.4 11.4 13.5V11C11.2 11 11 11 10.8 11C8.4 11 6.4 13 6.4 15.4C6.4 17.8 8.4 19.8 10.8 19.8C13.2 19.8 15.2 17.8 15.2 15.4V10.1C16.2 10.8 17.5 11.3 19 11.3V8.5Z" fill="#25F4EE" fillOpacity="0.3" />
    </svg>
  );
}

function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="6" y="6" width="12" height="12" rx="3.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16.2" cy="7.8" r="1" fill="white" />
    </svg>
  );
}

const NETWORK_ICONS: Record<NetworkId, ({ size }: { size?: number }) => React.ReactElement> = {
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  instagram: InstagramIcon,
};

/* ──────────────────────────── CONFIG ──────────────────────────── */

const NETWORKS: Record<NetworkId, NetworkMeta> = {
  linkedin:  { name: "LinkedIn",  color: "#0A66C2", accent: "#0A66C2" },
  tiktok:    { name: "TikTok",    color: "#FE2C55", accent: "#25F4EE" },
  instagram: { name: "Instagram", color: "#E1306C", accent: "#F77737" },
};

/* ────────────────────────────────────────────────────────────
   COUCHE DONNÉES
   En prod : remplace le corps par
     const res = await fetch("/api/social-stats");
     return (await res.json()) as SocialStats;
   ──────────────────────────────────────────────────────────── */

function makeSeries(base: number, dailyGrowth: number, volatility: number): SeriesPoint[] {
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

async function fetchSocialStats(): Promise<SocialStats> {
  await new Promise((r) => setTimeout(r, 600));
  return {
    linkedin: {
      followers: 4820, followersDelta: 3.2,
      reach: 38400, reachDelta: 12.5, reachLabel: "Impressions",
      followersSeries: makeSeries(4600, 7, 14),
    },
    tiktok: {
      followers: 12750, followersDelta: 8.9,
      reach: 284000, reachDelta: 22.1, reachLabel: "Vues",
      followersSeries: makeSeries(11800, 32, 60),
    },
    instagram: {
      followers: 6340, followersDelta: -1.4,
      reach: 22800, reachDelta: 5.8, reachLabel: "Reach",
      followersSeries: makeSeries(6400, -3, 18),
    },
  };
}

/* ──────────────────────────── UI ──────────────────────────── */

function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${
        up ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {up ? "+" : ""}{value}{suffix}
    </span>
  );
}

interface StatTileProps {
  icon: IconType;
  label: string;
  value: number;
  delta?: number;
}

function StatTile({ icon: Icon, label, value, delta }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/60 p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={16} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">
        {value.toLocaleString("fr-FR")}
      </div>
      {delta !== undefined && <Delta value={delta} />}
    </div>
  );
}

function NetworkCard({ id, data }: { id: NetworkId; data: NetworkStats }) {
  const net = NETWORKS[id];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: `${net.color}10` }}
      >
        <div className="flex items-center gap-3">
          {NETWORK_ICONS[id]({ size: 36 })}
          <div>
            <h3 className="font-semibold text-slate-900">{net.name}</h3>
            <p className="text-xs text-slate-500">@lagrandeclasse</p>
          </div>
        </div>
        <ArrowUpRight className="text-slate-400" size={18} />
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <StatTile icon={Users} label="Abonnés" value={data.followers} delta={data.followersDelta} />
        <StatTile icon={Eye} label={data.reachLabel} value={data.reach} delta={data.reachDelta} />
      </div>

      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data.followersSeries} margin={{ top: 5, right: 12, left: 12, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}
              labelStyle={{ fontSize: 12 }}
            />
            <Line type="monotone" dataKey="value" stroke={net.color} strokeWidth={2.5} dot={false} name="Abonnés" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ComparativeChart({ stats }: { stats: SocialStats }) {
  const data = useMemo(
    () =>
      (Object.keys(NETWORKS) as NetworkId[]).map((id) => ({
        name: NETWORKS[id].name,
        abonnés: stats[id].followers,
        fill: NETWORKS[id].color,
      })),
    [stats]
  );

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 font-semibold text-slate-900">Comparatif des abonnés</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(v) => Number(v).toLocaleString("fr-FR")}
            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}
          />
          <Bar dataKey="abonnés" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TotalsBar({ stats }: { stats: SocialStats }) {
  const totalFollowers = (Object.keys(stats) as NetworkId[])
    .reduce((sum, id) => sum + stats[id].followers, 0);
  const totalReach = (Object.keys(stats) as NetworkId[])
    .reduce((sum, id) => sum + stats[id].reach, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white">
        <div className="flex items-center gap-2 text-slate-300">
          <Users size={16} /><span className="text-xs uppercase tracking-wide">Audience totale</span>
        </div>
        <div className="mt-2 text-3xl font-bold">{totalFollowers.toLocaleString("fr-FR")}</div>
      </div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-slate-500">
          <Eye size={16} /><span className="text-xs uppercase tracking-wide">Portée cumulée (30j)</span>
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900">{totalReach.toLocaleString("fr-FR")}</div>
      </div>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-slate-500">
          <Heart size={16} /><span className="text-xs uppercase tracking-wide">Réseau en croissance</span>
        </div>
        <div className="mt-2 text-3xl font-bold text-slate-900">TikTok</div>
        <Delta value={stats.tiktok.followersDelta} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    const data = await fetchSocialStats();
    setStats(data);
    setUpdatedAt(new Date());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/asset/logo_lgc.png"
              alt="Logo La Grande Classe"
              width={96}
              height={96}
              className="rounded-full object-cover"
            />
            <div>
              <h1 className="text-2xl font-normal text-slate-900 antialiased tracking-tight">Réseaux sociaux La Grande Classe</h1>
              <p className="text-sm text-slate-500">
                {updatedAt
                  ? `Dernière mise à jour : ${updatedAt.toLocaleTimeString("fr-FR")}`
                  : "Chargement…"}
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>

        {loading || !stats ? (
          <div className="grid place-items-center py-32 text-slate-400">
            <RefreshCw className="animate-spin" size={32} />
          </div>
        ) : (
          <>
            <TotalsBar stats={stats} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <NetworkCard id="linkedin" data={stats.linkedin} />
              <NetworkCard id="tiktok" data={stats.tiktok} />
              <NetworkCard id="instagram" data={stats.instagram} />
            </div>
            <ComparativeChart stats={stats} />
          </>
        )}
      </div>
      <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        LGC - Recherche &amp; Développement &middot; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
