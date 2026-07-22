"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import type { SchedulerTask } from "@/lib/database";

export function SchedulerPanel() {
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/scheduler");
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggle(name: string, current: boolean) {
    await fetch("/api/admin/scheduler", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, enabled: !current }),
    });
    await fetchData();
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl py-16 text-center"><LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" /><p className="mt-3 text-xs text-muted-foreground">加载中…</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">调度任务</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">控制 Vercel Cron 每日执行的调度任务</p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="divide-y divide-border/50">
          {tasks.map((t) => (
            <div key={t.name} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-xs font-medium font-mono">{t.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t.description}</p>
              </div>
              <Switch
                checked={t.enabled}
                onCheckedChange={() => toggle(t.name, t.enabled)}
                aria-label={t.description}
                size="default"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
