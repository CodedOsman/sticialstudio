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
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-black font-mono text-gray-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-4 py-1 text-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-gray-300">
            <TerminalSquare size={13} className="text-emerald-400" />
            <span>TERMINAL &amp; SERIAL MONITOR</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-wider ${
              webSerial.isConnected
                ? "text-green-500"
                : "text-gray-500"
            }`}
          >
            {webSerial.isConnected ? "CONNECTED" : "DISCONNECTED"}
          </span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex items-center gap-1 text-[10px] text-gray-500 transition-colors hover:text-gray-300 uppercase tracking-wider"
          >
            COLLAPSE
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-gray-800 px-4 pt-2">
        {TAB_OPTIONS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.id === "serial" ? serialMessages.length : tab.id === "build" ? buildMessages.length : connectionMessages.length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-1 pb-2 text-xs transition-all uppercase tracking-wider ${
                isActive
                  ? 'border-gray-300 text-gray-200'
                  : 'border-transparent text-gray-600 hover:text-gray-400'
              }`}
            >
              {tab.label}
              <span className="text-[10px] opacity-70">[{count}]</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "serial" ? (
          <ConsolePanel
            webSerial={webSerial}
            messages={serialMessages}
            emptyTitle="Serial Monitor ready"
            emptyBody="Connect a board to start sending and receiving serial data."
          />
        ) : null}

        {activeTab === "build" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-gray-800 px-4 py-1 text-[10px] text-gray-500 uppercase tracking-wider">
              Verify, upload, sync, and flash events
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 space-y-0 overflow-y-auto px-4 py-2">
              {buildMessages.length > 0 ? (
                buildMessages.map((message, index) => {
                  let prefix = '';
                  let colorClass = 'text-gray-300';
                  switch (message.type) {
                      case 'system': prefix = '[SYSTEM] '; colorClass = 'text-sky-300'; break;
                      case 'error': prefix = '[ERROR] '; colorClass = 'text-red-400'; break;
                      case 'sent': prefix = '> '; colorClass = 'text-green-400'; break;
                  }
                  return (
                  <div key={`${message.timestamp}-${index}`} className={`whitespace-pre-wrap break-all text-xs leading-5 ${colorClass}`}>
                    <span className="opacity-70">{prefix}</span>
                    {message.text}
                  </div>
                  );
                })
              ) : (
                <div className="flex h-full min-h-[100px] flex-col items-center justify-center text-center text-gray-500 text-xs">
                  <Zap size={22} className="mb-2 text-gray-700" />
                  <p className="font-semibold uppercase tracking-wider text-gray-400">No build activity yet</p>
                  <p className="mt-1 text-gray-600">Run Verify or Upload to view compilation output and toolchain logs.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "connection" ? (
          <div className="custom-scrollbar h-full overflow-y-auto p-4 text-xs leading-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="font-bold uppercase tracking-wider text-gray-500">Status</p>
                <p className="mt-1 text-gray-300">
                  {webSerial.isConnected ? "Board connected" : "Waiting for a board"}
                </p>
                <p className="mt-1 text-gray-600">
                  {webSerial.isConnected
                    ? "Serial communication is available. You can monitor output here while you build with blocks."
                    : "Use Connect in the top bar or open the Serial Monitor tab to choose a baud rate and attach a device."}
                </p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-gray-500">Browser support</p>
                <p className="mt-1 text-gray-300">
                  {isSerialSupported ? "Web Serial ready" : "Web Serial unavailable"}
                </p>
                <p className="mt-1 text-gray-600">
                  {isSerialSupported
                    ? "This browser can open serial devices for the block environment."
                    : "Serial features need a browser with Web Serial support, such as Chrome or Edge."}
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-800 pt-4">
              <p className="mb-2 font-bold uppercase tracking-wider text-gray-500">Recent connection events</p>
              <div className="space-y-0">
                {connectionMessages.length > 0 ? (
                  connectionMessages.map((message, index) => {
                    let prefix = '';
                    let colorClass = 'text-gray-300';
                    switch (message.type) {
                        case 'system': prefix = '[SYSTEM] '; colorClass = 'text-sky-300'; break;
                        case 'error': prefix = '[ERROR] '; colorClass = 'text-red-400'; break;
                        case 'sent': prefix = '> '; colorClass = 'text-green-400'; break;
                    }
                    return (
                    <div key={`${message.timestamp}-${index}`} className={`whitespace-pre-wrap break-all text-xs leading-5 ${colorClass}`}>
                      <span className="opacity-70">{prefix}</span>
                      {message.text}
                    </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-600">No connection events yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
