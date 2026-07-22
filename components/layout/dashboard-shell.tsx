import Link from "next/link";
import { Activity, Star } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-dvh overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Brand */}
        <div className="flex h-12 shrink-0 items-center gap-2.5 px-4">
          <span className="grid size-6 place-items-center rounded-md bg-foreground text-background">
            <Activity className="size-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Watchdog</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3" aria-label="主导航">
          <Link
            href="/dashboard"
            className="flex h-8 items-center gap-2.5 rounded-md bg-sidebar-accent px-2.5 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <Star className="size-3.5" />
            Star 看板
          </Link>
        </nav>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            1024XEngineer
          </p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
