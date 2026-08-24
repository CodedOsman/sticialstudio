"use client";

import React from "react";
import { FolderOpen, Settings, LayoutGrid, Search, Cpu } from "lucide-react";

interface IdeActivityBarProps {
  activeView: string;
  onChangeView: (viewId: string) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  enabledViewIds?: string[];
}

export default function IdeActivityBar({
  activeView,
  onChangeView,
  isCollapsed,
  onToggleCollapsed,
  enabledViewIds = ["files"],
}: IdeActivityBarProps) {
  const enabledViews = React.useMemo(() => new Set(enabledViewIds), [enabledViewIds]);

  const handleItemClick = (viewId: string) => {
    if (!enabledViews.has(viewId)) {
      return;
    }

    if (activeView === viewId) {
      onToggleCollapsed();
    } else {
      onChangeView(viewId);
      if (isCollapsed) {
        onToggleCollapsed();
      }
    }
  };

  const navItems = [
    { id: "files", icon: <FolderOpen size={22} strokeWidth={1.5} />, label: "Explorer" },
    { id: "search", icon: <Search size={22} strokeWidth={1.5} />, label: "Search" },
    { id: "boards", icon: <Cpu size={22} strokeWidth={1.5} />, label: "Boards Manager" },
    { id: "libraries", icon: <LayoutGrid size={22} strokeWidth={1.5} />, label: "Library Manager" },
  ];

  return (
    <div className="flex h-full w-[54px] flex-col items-center justify-between border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)] py-4 shadow-inner backdrop-blur-xl">
      <div className="flex w-full flex-col items-center gap-4">
        {navItems.map((item) => {
          const isEnabled = enabledViews.has(item.id);
          const isActive = activeView === item.id && !isCollapsed;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.id)}
              disabled={!isEnabled}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-md transition-all duration-200 ${
                isActive
                  ? "bg-[color:var(--ui-color-primary)]/14 text-[var(--ui-color-primary)] shadow-[0_12px_24px_-22px_rgba(139,92,246,0.9)]"
                  : "text-[var(--ui-color-text-soft)] hover:bg-[color:var(--ui-surface-elevated)] hover:text-[var(--ui-color-text)]"
              } ${!isEnabled ? "cursor-not-allowed opacity-45" : ""}`}
              title={item.label}
            >
              {isActive ? (
                <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-md bg-[var(--ui-color-primary)]" />
              ) : null}
              {item.icon}
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-md text-[var(--ui-color-text-soft)] transition-colors hover:bg-[color:var(--ui-surface-elevated)] hover:text-[var(--ui-color-text)]"
          title="Settings"
        >
          <Settings size={22} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
