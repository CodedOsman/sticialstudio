"use client";

import React from "react";
import { FolderOpen } from "lucide-react";

export interface IdeLeftRailView {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface IdeLeftRailProps {
  title: string;
  subtitle: string;
  views: IdeLeftRailView[];
  activeView: string;
  onChangeView: (viewId: string) => void;
}

export default function IdeLeftRail({
  title,
  subtitle,
  views,
  activeView,
  onChangeView,
}: IdeLeftRailProps) {
  const currentView = views.find((view) => view.id === activeView) || views[0];

  return (
    <section className="ui-foundation-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center border-b border-[color:var(--ui-border-soft)] px-3 py-2 bg-[color:var(--ui-color-surface)]">
        {views.length > 1 ? (
          <div className="flex items-center gap-1">
            {views.map((view) => {
              const isActive = currentView.id === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => onChangeView(view.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[color:var(--ui-color-surface-hover)] text-[color:var(--ui-color-text)] shadow-sm border border-[color:var(--ui-border-soft)]"
                      : "border border-transparent text-[color:var(--ui-color-text-soft)] hover:bg-[color:var(--ui-color-surface-hover)] hover:text-[color:var(--ui-color-text)]"
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{currentView?.content}</div>
    </section>
  );
}
