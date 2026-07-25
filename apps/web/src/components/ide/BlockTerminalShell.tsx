"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Link2, Radio, TerminalSquare, Zap } from "lucide-react";
import ConsolePanel from "./ConsolePanel";
import type { useWebSerial, SerialMessage } from "../../hooks/useWebSerial";

export type BlockTerminalTab = "serial" | "build" | "connection";

interface BlockTerminalShellProps {
  webSerial: ReturnType<typeof useWebSerial>;
  collapsed: boolean;
  requestedTab?: BlockTerminalTab;
  onToggleCollapsed: () => void;
  onTabChange?: (tab: BlockTerminalTab) => void;
}

const TAB_OPTIONS: Array<{ id: BlockTerminalTab; label: string; icon: React.ReactNode }> = [
  { id: "serial", label: "Serial Monitor", icon: <TerminalSquare size={14} /> },
  { id: "build", label: "Build Output", icon: <Zap size={14} /> },
  { id: "connection", label: "Connection", icon: <Link2 size={14} /> },
];

const BUILD_MESSAGE_PATTERN = /(compil|upload|flash|stk500|hex|syncing|synced |raw repl|main\.py|micropython sync|compiler api|files saved to the micropython device|connect device first|upload aborted|verify)/i;
const CONNECTION_MESSAGE_PATTERN = /(connected to device|disconnected|disconnect|connection failed|no port selected|web serial|device disconnected unexpectedly|usb|baud|browser)/i;

function getMessageChannel(message: SerialMessage): BlockTerminalTab {
  if (BUILD_MESSAGE_PATTERN.test(message.text)) {
    return "build";
  }

  if (CONNECTION_MESSAGE_PATTERN.test(message.text)) {
    return "connection";
  }

  return "serial";
}

function toneForMessage(type: SerialMessage["type"]) {
  switch (type) {
    case "system":
      return "border border-sky-400/18 bg-sky-400/10 text-sky-100";
    case "error":
      return "border border-rose-400/20 bg-rose-400/10 text-rose-100";
    case "sent":
      return "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    default:
      return "ui-elevated-surface text-[var(--ui-color-text-on-surface)]";
  }
}

export default function BlockTerminalShell({
  webSerial,
  collapsed,
  requestedTab,
  onToggleCollapsed,
  onTabChange,
}: BlockTerminalShellProps) {
  const [activeTab, setActiveTab] = useState<BlockTerminalTab>(requestedTab ?? "serial");

  useEffect(() => {
    if (!requestedTab) return;
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const serialMessages = useMemo(
    () => webSerial.messages.filter((message) => getMessageChannel(message) === "serial"),
    [webSerial.messages]
  );

  const buildMessages = useMemo(
    () => webSerial.messages.filter((message) => getMessageChannel(message) === "build").slice(-60),
    [webSerial.messages]
  );

  const connectionMessages = useMemo(
    () => webSerial.messages.filter((message) => getMessageChannel(message) === "connection").slice(-16),
    [webSerial.messages]
  );

  const isSerialSupported = typeof navigator !== "undefined" && "serial" in navigator;

  const handleTabChange = (tab: BlockTerminalTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <section className="ui-foundation-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] shadow-[0_28px_70px_-42px_rgba(0,0,0,0.42)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--ui-border-soft)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ui-color-primary)]/76">Terminal Dock</p>
          <p className="mt-1 text-sm ui-panel-copy-soft">Serial, upload, and device feedback for block projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
              webSerial.isConnected
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "ui-pill-surface text-[var(--ui-color-text-soft)]"
            }`}
          >
            <Radio size={12} />
            {webSerial.isConnected ? "Connected" : "Disconnected"}
          </span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ui-action-quiet inline-flex h-9 items-center gap-2 rounded-[12px] px-3 text-xs font-semibold transition-all"
          >
            Collapse
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--ui-border-soft)] px-4 py-2.5">
        {TAB_OPTIONS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.id === "serial" ? serialMessages.length : tab.id === "build" ? buildMessages.length : connectionMessages.length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'ui-tab-active shadow-[0_14px_26px_-18px_rgba(0,0,0,0.28)]'
                  : 'ui-pill-surface text-[var(--ui-color-text-soft)] hover:bg-[color:var(--ui-surface-elevated)] hover:text-[var(--ui-color-text-on-surface)]'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold opacity-90">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "serial" ? (
          <ConsolePanel
            webSerial={webSerial}
            messages={serialMessages}
            emptyTitle="No serial activity yet"
            emptyBody="Connect a board or wait for serial output to start filling this monitor."
          />
        ) : null}

        {activeTab === "build" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-[color:var(--ui-border-soft)] px-4 py-3 text-xs ui-panel-copy-quiet">
              Verify, upload, sync, and flash events appear here while the block project talks to the board toolchain.
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {buildMessages.length > 0 ? (
                buildMessages.map((message, index) => (
                  <div key={`${message.timestamp}-${index}`} className={`rounded-[12px] px-3 py-2 ${toneForMessage(message.type)}`}>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">{message.type}</div>
                    <div className="whitespace-pre-wrap break-words text-xs leading-5">{message.text}</div>
                  </div>
                ))
              ) : (
                <div className="flex h-full min-h-[120px] items-center justify-center text-center">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ui-color-text-soft)]">No build activity yet</p>
                    <p className="text-xs ui-panel-copy-quiet">Run Verify or Upload to start filling this stream.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "connection" ? (
          <div className="custom-scrollbar h-full overflow-y-auto p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="ui-elevated-surface rounded-[18px] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ui-color-text-soft)]">Status</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ui-color-text-on-surface)]">
                  {webSerial.isConnected ? "Board connected" : "Waiting for a board"}
                </p>
                <p className="mt-2 text-sm leading-6 ui-panel-copy-quiet">
                  {webSerial.isConnected
                    ? "Serial communication is available. You can monitor output here while you build with blocks."
                    : "Use Connect in the top bar or open the Serial Monitor tab to choose a baud rate and attach a device."}
                </p>
              </div>
              <div className="ui-elevated-surface rounded-[18px] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ui-color-text-soft)]">Browser support</p>
                <p className="mt-3 text-lg font-semibold text-[var(--ui-color-text-on-surface)]">
                  {isSerialSupported ? "Web Serial ready" : "Web Serial unavailable"}
                </p>
                <p className="mt-2 text-sm leading-6 ui-panel-copy-quiet">
                  {isSerialSupported
                    ? "This browser can open serial devices for the block environment."
                    : "Serial features need a browser with Web Serial support, such as Chrome or Edge."}
                </p>
              </div>
            </div>

            <div className="ui-quiet-surface mt-4 rounded-[18px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ui-color-text-soft)]">Recent connection events</p>
              <div className="mt-3 space-y-2">
                {connectionMessages.length > 0 ? (
                  connectionMessages.map((message, index) => (
                    <div key={`${message.timestamp}-${index}`} className={`rounded-[12px] px-3 py-2 ${toneForMessage(message.type)}`}>
                      <div className="whitespace-pre-wrap break-words text-xs leading-5">{message.text}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm ui-panel-copy-quiet">No connection events yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
