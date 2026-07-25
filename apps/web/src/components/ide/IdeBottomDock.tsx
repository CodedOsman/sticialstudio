"use client";

import React from "react";
import { TerminalSquare, ChevronUp } from "lucide-react";

interface IdeBottomDockProps {
  collapsed: boolean;
  height: number;
  isCompact: boolean;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onToggleCollapsed?: () => void;
  children: React.ReactNode;
}

export default function IdeBottomDock({
  collapsed,
  height,
  isCompact,
  onResizeStart,
  onToggleCollapsed,
  children,
}: IdeBottomDockProps) {
  if (collapsed) {
    return (
      <div className="absolute bottom-4 left-4 z-50">
        <button
          onClick={onToggleCollapsed}
          className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,#1e2333_0%,#11141d_100%)] px-4 text-xs font-semibold uppercase tracking-widest text-[var(--ui-color-text)] shadow-xl transition-all hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#242a3d_0%,#151924_100%)]"
        >
          <TerminalSquare size={16} className="text-sky-400" />
          Terminal
          <ChevronUp size={16} className="ml-1 text-[var(--ui-color-text-soft)]" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="absolute bottom-4 left-4 right-4 z-50 flex flex-col overflow-hidden rounded-[24px] border border-[color:var(--ui-border-soft)] shadow-[0_28px_72px_-40px_rgba(0,0,0,0.95)] backdrop-blur"
      style={{ height, maxHeight: '80vh' }}
    >
      {!isCompact ? (
        <div 
          className="absolute left-0 right-0 top-0 h-4 cursor-row-resize z-50" 
          onMouseDown={onResizeStart}
        />
      ) : null}
      <div className="flex h-full w-full flex-col min-h-0 bg-[linear-gradient(180deg,rgba(17,20,29,0.95)_0%,rgba(11,14,22,0.98)_100%)]">
        {children}
      </div>
    </div>
  );
}
