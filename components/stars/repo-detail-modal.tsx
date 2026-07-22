"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, LoaderCircle, TrendingUp, X } from "lucide-react";

import type { Repo } from "@/lib/database";

type ChartPoint = Record<string, string | number | null>;

function Sparkline({ data, repo }: { data: ChartPoint[]; repo: string }) {
  const points = useMemo(() => {
    return data
      .map((d) => (typeof d[repo] === "number" ? d[repo] as number : null))
      .filter((v): v is number => v !== null);
  }, [data, repo]);

  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 280;
  const h = 48;
  const pad = 2;

  const pathD = points
    .map((v, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // SVG gradient fill
  const gradientId = `spark-${repo.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className="mt-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="size-3 text-muted-foreground" />
        <span className="text-[11px] font-medium">Star 趋势</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{points[0]} → {points[points.length - 1]}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L${w - pad},${h - pad} L${pad},${h - pad} Z`} fill={`url(#${gradientId})`} />
        <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function RepoDetailModal({
  repoFullName,
  chartData,
  open,
  onClose,
}: {
  repoFullName: string | null;
  chartData?: ChartPoint[];
  open: boolean;
  onClose: () => void;
}) {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !repoFullName) return;
    setLoading(true); setError("");
    fetch(`/api/admin/repos?detail=${encodeURIComponent(repoFullName)}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("未找到")))
      .then(setRepo)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, repoFullName]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="仓库详情">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-label="关闭" />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-card p-5 shadow-[0_16px_48px_rgb(0_0_0/15%)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">仓库详情</h2>
          <button type="button" onClick={onClose} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-3.5" /></button>
        </div>

        {loading ? (
          <div className="py-12 text-center"><LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" /><p className="mt-2 text-xs text-muted-foreground">加载中…</p></div>
        ) : error ? (
          <div className="py-12 text-center"><p className="text-xs text-muted-foreground">{error}</p></div>
        ) : repo ? (
          <div className="grid gap-4">
            <div>
              <Link href={`https://github.com/${repo.githubRepo}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary">
                {repo.githubRepo}<ExternalLink className="size-3 text-muted-foreground" />
              </Link>
              {repo.description && <p className="mt-1 text-xs text-muted-foreground">{repo.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {repo.language && <div><p className="text-[11px] text-muted-foreground">语言</p><p className="text-xs">{repo.language}</p></div>}
              <div><p className="text-[11px] text-muted-foreground">可见性</p><p className="text-xs">{repo.visibility}</p></div>
              <div><p className="text-[11px] text-muted-foreground">状态</p><p className="text-xs">{repo.archived ? "已归档" : "活跃"}</p></div>
              {repo.homepageUrl && <div className="col-span-2"><p className="text-[11px] text-muted-foreground">Deploy URL</p><Link href={repo.homepageUrl} target="_blank" className="text-xs text-primary hover:underline">{repo.homepageUrl}</Link></div>}
            </div>

            {repo.topics && repo.topics.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Topics</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{repo.topics.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{t}</span>)}</div>
              </div>
            )}

            {chartData && repoFullName && <Sparkline data={chartData} repo={repoFullName} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}
