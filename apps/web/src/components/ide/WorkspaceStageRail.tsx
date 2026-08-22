"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/ui/cn";
import { fadeInUp } from "@/components/ui/motion";

type WorkspaceStageItem = {
  label: string;
  active?: boolean;
  subtle?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
};

interface WorkspaceStageRailProps {
  items: WorkspaceStageItem[];
  className?: string;
  variant?: "default" | "dark";
}

export default function WorkspaceStageRail({ items, className, variant = "default" }: WorkspaceStageRailProps) {
  const dark = variant === "dark";

  return (
    <motion.div
      className={cn(
        dark
          ? "inline-flex flex-wrap items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] p-1.5 shadow-[0_14px_34px_-28px_rgba(0,0,0,0.55)]"
          : "inline-flex flex-wrap items-center gap-2 rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] p-1.5 shadow-[0_14px_30px_-24px_rgba(26,41,72,0.16)]",
        className
      )}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => {
        const interactive = typeof item.onClick === "function";
        const sharedClassName = cn(
          "inline-flex items-center gap-2 rounded-[14px] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all",
          dark
            ? item.active
              ? "border border-white/14 bg-[linear-gradient(180deg,#666cf6_0%,#565ce8_100%)] text-white shadow-[0_14px_28px_-18px_rgba(92,96,244,0.58)]"
              : item.subtle
                ? "border border-white/8 bg-white/[0.03] text-slate-400"
                : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
            : item.active
              ? "bg-[var(--ui-color-primary)] text-white shadow-[var(--ui-shadow-button)]"
              : item.subtle
                ? "border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[var(--ui-color-text-soft)]"
                : "text-[var(--ui-color-text-muted)] hover:bg-[color:var(--ui-color-surface)] hover:text-[var(--ui-color-text)]",
          interactive && "cursor-pointer"
        );

        if (interactive) {
          return (
            <button key={item.label} type="button" onClick={item.onClick} className={sharedClassName}>
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          );
        }

        return (
          <div key={item.label} className={sharedClassName}>
            {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
            <span>{item.label}</span>
          </div>
        );
      })}
    </motion.div>
  );
}
