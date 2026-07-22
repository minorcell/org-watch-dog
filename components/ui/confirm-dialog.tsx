"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open, title, description, confirmLabel = "确认", cancelLabel = "取消",
  variant = "default", onConfirm, onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
            aria-label="关闭对话框"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative z-10 w-full max-w-[320px] rounded-lg border bg-card p-5 shadow-[0_16px_48px_rgb(0_0_0/15%)]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
          >
            {variant === "danger" && (
              <span className="mb-3 grid size-9 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-4" />
              </span>
            )}
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="inline-flex h-8 items-center rounded-md border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent">{cancelLabel}</button>
              <button ref={confirmRef} type="button" onClick={onConfirm} className={variant === "danger" ? "inline-flex h-8 items-center rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90" : "inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"}>{confirmLabel}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
