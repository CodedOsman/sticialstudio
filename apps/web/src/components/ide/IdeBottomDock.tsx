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
    return null;
  }

  return (
    <div 
      className="relative flex flex-col overflow-hidden border-t border-[color:var(--ui-border-soft)] backdrop-blur"
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
