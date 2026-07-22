"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZES = [10, 20, 50, 100] as const;

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>每页</span>
        <Select value={String(pageSize)} onValueChange={(v) => v && onPageSizeChange(Number(v))}>
          <SelectTrigger size="sm" className="h-6 w-auto min-w-0 gap-1 border bg-transparent px-1 text-[11px] [&_svg]:size-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>条，共 {total} 条</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
          aria-label="上一页"
        >
          <ChevronLeft className="size-3" />
        </button>
        {renderPages(page, totalPages, onPageChange)}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent disabled:opacity-30"
          aria-label="下一页"
        >
          <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}

function renderPages(current: number, total: number, onChange: (p: number) => void) {
  const pages: (number | "...")[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      if (i !== 1 && i !== total) pages.push(i);
    }
    if (current < total - 2) pages.push("...");
    pages.push(total);
  }

  return pages.map((p, i) =>
    p === "..." ? (
      <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-muted-foreground">…</span>
    ) : (
      <button
        key={p}
        type="button"
        onClick={() => onChange(p)}
        className={cn(
          "grid size-6 place-items-center rounded text-[11px] transition-colors",
          p === current ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-accent",
        )}
        aria-label={`第 ${p} 页`}
        aria-current={p === current ? "page" : undefined}
      >
        {p}
      </button>
    ),
  );
}
