"use client";

import React from "react";

interface IdeShellFrameProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  bottom: React.ReactNode;
  leftCollapsed: boolean;
  rightCollapsed?: boolean;
  leftWidth?: number;
  rightWidth?: number;
}

export default function IdeShellFrame({
  left,
  center,
  right,
  bottom,
  leftCollapsed,
  rightCollapsed,
  leftWidth = 272,
  rightWidth,
}: IdeShellFrameProps) {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
      <div
        className="grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-200"
        style={{
          gridTemplateColumns: `${leftCollapsed ? "0px" : `${leftWidth}px`} minmax(0,1fr)${
            right ? ` ${rightCollapsed ? "0px" : `${rightWidth}px`}` : ""
          }`,
        }}
      >
        <aside
          className={`min-h-0 overflow-hidden transition-[opacity,transform] duration-200 ${
            leftCollapsed ? "pointer-events-none -translate-x-2 opacity-0" : "opacity-100"
          }`}
        >
          {left}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
          <main className="min-h-0 flex-1 overflow-hidden">{center}</main>
          {bottom && <div className="shrink-0">{bottom}</div>}
        </div>

        {right && (
          <aside
            className={`min-h-0 overflow-hidden transition-[opacity,transform] duration-200 ${
              rightCollapsed ? "pointer-events-none translate-x-2 opacity-0" : "opacity-100"
            }`}
          >
            {right}
          </aside>
        )}
      </div>
    </div>
  );
}
