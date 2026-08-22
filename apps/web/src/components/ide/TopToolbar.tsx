"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Code2,
  Cpu,
  FolderOpen,
  Link2,
  Link2Off,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Rocket,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { fadeInUp } from "@/components/ui/motion";
import ThemeToggle from '@/components/layout/ThemeToggle';
import { BOARD_CONFIG } from '@/lib/boards/boardConfig';

type TopToolbarVariant = "default" | "arduino-text";

interface TopToolbarProps {
  projectName?: string;
  boardName: string;
  codingMode: string | null;
  environment: string;
  isConnected: boolean;
  isCompiling: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  showLeftToggle?: boolean;
  showPanelControls?: boolean;

  onVerify: () => void;
  onUpload: () => void;
  onConnectDevice: () => void;
  onChangeBoard: (board: string) => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onNewSketch: () => void;
  onOpenPreferences: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleBottom: () => void;
  serialError?: string | null;
  saveStatusText?: string | null;
  saveStatusTone?: "neutral" | "success" | "error";
  variant?: TopToolbarVariant;
  onChangeCodingMode?: (mode: "block" | "text") => void;
}

const chipBaseClass =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]";

const utilityButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--ui-border-strong)] hover:text-[var(--ui-color-primary)]";

function formatBoardStatus(boardName: string) {
  return boardName.toUpperCase();
}

export default function TopToolbar({
  projectName,
  boardName,
  codingMode,
  environment,
  isConnected,
  isCompiling,
  isSaving,
  hasUnsavedChanges,
  leftCollapsed,
  rightCollapsed,
  bottomCollapsed,
  showLeftToggle = true,
  showPanelControls = true,

  onVerify,
  onUpload,
  onConnectDevice,
  onChangeBoard,
  onSaveProject,
  onOpenProject,
  onNewSketch,
  onOpenPreferences,
  onToggleLeft,
  onToggleRight,
  onToggleBottom,
  serialError,
  saveStatusText,
  saveStatusTone = "neutral",
  variant = "default",
  onChangeCodingMode,
}: TopToolbarProps) {
  const saveStatusClass =
    saveStatusTone === "success"
      ? "border-[color:var(--ui-color-success)]/20 bg-[color:var(--ui-color-success)]/10 text-[color:var(--ui-color-success)]"
      : saveStatusTone === "error"
        ? "border-rose-300 bg-rose-50 text-rose-600"
        : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)]";

  const isBlockWorkspace = codingMode === "block";

  if (variant === "arduino-text") {
    return (
      <motion.header
        className="z-10 flex-shrink-0 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)]/95 backdrop-blur-xl"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onVerify}
              disabled={isCompiling}
              title="Verify sketch (Ctrl+R)"
              className="flex h-9 items-center gap-2 rounded-[10px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-4 text-[12px] font-semibold tracking-[0.02em] text-[color:var(--ui-color-text)] shadow-[0_14px_26px_-18px_rgba(16,185,129,0.65)] transition-all hover:-translate-y-0.5 hover:bg-emerald-400/24 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <CheckCircle2 size={14} strokeWidth={2.5} className={isCompiling ? "animate-spin" : ""} />
              {isCompiling ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={onUpload}
              disabled={isCompiling}
              title="Upload sketch (Ctrl+U)"
              className="flex h-9 items-center gap-2 rounded-[10px] border border-[color:var(--ui-color-primary)]/26 bg-[color:var(--ui-color-primary)] px-4 text-[12px] font-semibold tracking-[0.02em] text-[color:var(--ui-color-text)] shadow-[0_16px_28px_-18px_rgba(139,92,246,0.72)] transition-all hover:-translate-y-0.5 hover:bg-[color:var(--ui-color-primary)]/90 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <Rocket size={14} strokeWidth={2.5} />
              {isCompiling ? "Uploading..." : "Upload"}
            </button>

            <div className="h-5 w-px bg-[color:var(--ui-border-soft)]" />

            <div className="relative flex items-center">
              <select
                value={boardName}
                onChange={(e) => onChangeBoard(e.target.value)}
                className="appearance-none flex h-9 items-center rounded-[10px] border border-[color:var(--ui-border-strong)] bg-[color:var(--ui-color-surface)] pl-3 pr-8 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-color-text)] outline-none transition-all hover:border-[color:var(--ui-color-primary)]/40 hover:text-[var(--ui-color-primary)] cursor-pointer"
              >
                {Object.keys(BOARD_CONFIG).map(boardKey => (
                  <option key={boardKey} value={boardKey} className="bg-[color:var(--ui-color-surface)] text-[var(--ui-color-text)]">
                    {boardKey}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-3 opacity-70 text-[var(--ui-color-text)]" />
            </div>

            {saveStatusText ? (
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${saveStatusClass}`}>
                {saveStatusText}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {onChangeCodingMode ? (
              <button
                type="button"
                onClick={() => onChangeCodingMode("block")}
                className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-medium text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-color-surface)] hover:text-[var(--ui-color-text)]"
              >
                <Sparkles size={14} />
                Switch to Blocks
              </button>
            ) : null}

            <div className="mx-1 h-4 w-px bg-[color:var(--ui-border-soft)]" />

            <button
              type="button"
              onClick={onSaveProject}
              className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-medium text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-color-surface)] hover:text-[var(--ui-color-text)]"
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save"}
              {hasUnsavedChanges ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
            </button>

            <button
              type="button"
              onClick={onConnectDevice}
              className={`flex h-9 items-center gap-2 rounded-[10px] border px-3 text-xs font-medium transition-all ${
                isConnected
                  ? "border-emerald-400/22 bg-emerald-400/12 text-emerald-200"
                  : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)] hover:text-[var(--ui-color-text)]"
              }`}
            >
              {isConnected ? <Link2 size={14} /> : <Link2Off size={14} />}
              {isConnected ? "Disconnect" : "Connect"}
            </button>

            <div className="mx-1 h-4 w-px bg-[color:var(--ui-border-soft)]" />



            <button
              type="button"
              onClick={onNewSketch}
              className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-medium text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-color-surface)] hover:text-[var(--ui-color-text)]"
            >
              <Plus size={14} />
              New Sketch
            </button>

            <button
              type="button"
              onClick={onOpenPreferences}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-color-surface)] hover:text-[var(--ui-color-text)]"
              title="Preferences"
            >
              <Settings2 size={14} />
            </button>
            <ThemeToggle className="h-9 rounded-[10px] px-2 text-[color:var(--ui-color-text)] hover:bg-[color:var(--ui-color-surface)] hover:text-[var(--ui-color-text)]" />
          </div>
        </div>

        {serialError ? (
          <div className="mx-3 mb-2 inline-flex items-center gap-2 rounded-[8px] border border-rose-400/22 bg-rose-400/12 px-3 py-1.5 text-xs text-rose-100">
            <AlertCircle size={14} />
            <span>{serialError}</span>
          </div>
        ) : null}
      </motion.header>
    );
  }

  if (isBlockWorkspace) {
    return (
      <motion.header
        className="z-10 flex-shrink-0 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] backdrop-blur-xl"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <button 
              type="button"
              onClick={onOpenProject} 
              className="text-[1.1rem] font-bold tracking-[-0.03em] text-[color:var(--ui-color-text)] transition-opacity hover:opacity-80 text-left focus:outline-none"
            >
              STEMAIDE IDE
            </button>
            <div className="h-5 w-px bg-[color:var(--ui-border-soft)]" />
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[color:var(--ui-color-text)]">
              <Sparkles size={14} className="text-indigo-400" />
              Blocks
            </span>
            {onChangeCodingMode ? (
              <button
                type="button"
                onClick={() => onChangeCodingMode("text")}
                className="ml-1 flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[11px] font-medium text-[color:var(--ui-color-text)] transition-colors hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]"
              >
                <Code2 size={13} />
                Switch to Text
              </button>
            ) : null}
            <div className="ml-1 mr-1 h-4 w-px bg-[color:var(--ui-border-soft)]" />
            <div className="relative flex items-center">
              <Cpu size={14} className="pointer-events-none absolute left-2.5 text-sky-400" />
              <select
                value={boardName}
                onChange={(e) => onChangeBoard(e.target.value)}
                className="appearance-none cursor-pointer rounded-[8px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] py-1 pl-8 pr-7 text-[12px] font-medium text-[color:var(--ui-color-text)] outline-none hover:bg-sky-400/20 transition-colors"
              >
                {Object.keys(BOARD_CONFIG).map((boardKey) => (
                  <option key={boardKey} value={boardKey} className="bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)]">
                    {boardKey}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 text-[color:var(--ui-color-text)] opacity-70" />
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                isConnected ? "text-emerald-300" : "text-[color:var(--ui-color-text)]"
              }`}
            >
              {isConnected ? <Link2 size={14} /> : <Link2Off size={14} />}
              {isConnected ? "Connected" : "Not connected"}
            </span>
            {saveStatusText ? <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${saveStatusClass}`}>{saveStatusText}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onNewSketch}
              className="flex h-8 items-center gap-2 rounded-[8px] px-3 text-xs font-medium text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]"
            >
              <Plus size={14} />
              New Sketch
            </button>
            <button
              type="button"
              onClick={onSaveProject}
              disabled={isSaving}
              className="flex h-8 items-center gap-2 rounded-[8px] px-3 text-xs font-medium text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]"
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save"}
              {hasUnsavedChanges ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
            </button>
            
            <div className="mx-1 h-4 w-px bg-[color:var(--ui-border-soft)]" />

            <button
              type="button"
              onClick={onVerify}
              disabled={isCompiling}
              className="flex h-8 items-center gap-2 rounded-[8px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 text-xs font-semibold text-[color:var(--ui-color-text)] transition-all hover:bg-emerald-400/20 disabled:opacity-60"
            >
              <CheckCircle2 size={14} />
              {isCompiling ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              onClick={onUpload}
              disabled={isCompiling}
              className="flex h-8 items-center gap-2 rounded-[8px] border border-indigo-400/40 bg-indigo-500 px-3 text-xs font-semibold text-[color:var(--ui-color-text)] transition-all hover:bg-indigo-600 disabled:opacity-60"
            >
              <Rocket size={14} />
              {isCompiling ? "Working..." : "Upload to Board"}
            </button>
            
            <div className="mx-1 h-4 w-px bg-[color:var(--ui-border-soft)]" />

            <button
              type="button"
              onClick={onConnectDevice}
              className="flex h-8 items-center gap-2 rounded-[8px] px-3 text-xs font-medium text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]"
            >
              {isConnected ? <Link2Off size={14} /> : <Link2 size={14} />}
              {isConnected ? "Disconnect" : "Connect"}
            </button>
            <div className="mx-1 h-4 w-px bg-[color:var(--ui-border-soft)]" />

            <button
              type="button"
              onClick={onToggleBottom}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]"
              title={bottomCollapsed ? "Show terminal" : "Hide terminal"}
            >
              {bottomCollapsed ? <PanelBottomOpen size={14} /> : <PanelBottomClose size={14} />}
            </button>
            
            <button
              type="button"
              onClick={onOpenPreferences}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[color:var(--ui-color-text)] transition-all hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]"
            >
              <Settings2 size={14} />
            </button>
          </div>
        </div>
        {serialError ? (
          <div className="mx-4 mb-2 inline-flex items-center gap-2 rounded-[8px] border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-200">
            <AlertCircle size={14} />
            <span>{serialError}</span>
          </div>
        ) : null}
      </motion.header>
    );
  }

  return (
    <motion.header
      className="ui-foundation-panel overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {onChangeCodingMode ? (
              <span className={`${chipBaseClass} border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)]`}>
                <Sparkles size={13} className={isBlockWorkspace ? "text-[var(--ui-color-primary)]" : "text-[var(--ui-color-accent)]"} />
                {isBlockWorkspace ? "Blocks" : "Code"}
              </span>
            ) : (
              <span className={`${chipBaseClass} border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)]`}>
                <Sparkles size={13} className="text-[var(--ui-color-accent)]" />
                {isBlockWorkspace ? "Blocks" : "Code"}
              </span>
            )}
            <span className={`${chipBaseClass} border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)]`}>
              {boardName}
            </span>
            <span className={`${chipBaseClass} border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)]`}>
              {environment}
            </span>
            <span
              className={`${chipBaseClass} ${
                isConnected
                  ? "border-[color:var(--ui-color-success)]/20 bg-[color:var(--ui-color-success)]/10 text-[color:var(--ui-color-success)]"
                  : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text)]"
              }`}
            >
              {isConnected ? <Link2 size={13} /> : <Link2Off size={13} />}
              {isConnected ? "Connected" : "Not connected"}
            </span>
            {saveStatusText ? <span className={`${chipBaseClass} ${saveStatusClass}`}>{saveStatusText}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.04em] text-[var(--ui-color-text)] sm:text-[1.95rem]">
              {projectName || "Untitled Project"}
            </h1>
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ui-color-warning)]">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Unsaved
              </span>
            ) : null}
          </div>


          {serialError ? (
            <div className="inline-flex items-center gap-2 rounded-[16px] border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              <AlertCircle size={14} />
              <span>{serialError}</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
            <Button variant="secondary" icon={<Plus size={16} />} onClick={onNewSketch} className="min-h-10 rounded-[16px] px-4 py-2 text-sm">
              New Sketch
            </Button>
            <Button variant="secondary" icon={<Save size={16} />} onClick={onSaveProject} disabled={isSaving} className="min-h-10 rounded-[16px] px-4 py-2 text-sm">
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button variant="secondary" icon={<CheckCircle2 size={16} />} onClick={onVerify} disabled={isCompiling} className="min-h-10 rounded-[16px] px-4 py-2 text-sm">
              {isCompiling ? "Verifying..." : "Verify"}
            </Button>
            <Button icon={<Rocket size={16} />} onClick={onUpload} disabled={isCompiling} className="min-h-10 rounded-[16px] px-4 py-2 text-sm">
              {isCompiling ? "Working..." : "Upload to Board"}
            </Button>
            <Button
              variant="secondary"
              icon={isConnected ? <Link2Off size={16} /> : <Link2 size={16} />}
              onClick={onConnectDevice}
              className="min-h-10 rounded-[16px] px-4 py-2 text-sm"
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
            <div className="relative flex items-center">
              <select
                value={boardName}
                onChange={(e) => onChangeBoard(e.target.value)}
                className="appearance-none flex h-10 items-center justify-between gap-2 rounded-[16px] border-none bg-secondary pl-4 pr-10 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 outline-none cursor-pointer"
              >
                {Object.keys(BOARD_CONFIG).map((boardKey) => (
                  <option key={boardKey} value={boardKey} className="bg-[color:var(--ui-color-surface)] text-[var(--ui-color-text)]">
                    {boardKey}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-4 text-secondary-foreground opacity-80" />
            </div>
            {onChangeCodingMode && !isBlockWorkspace ? (
              <Button variant="secondary" icon={<Sparkles size={16} />} onClick={() => onChangeCodingMode("block")} className="min-h-10 rounded-[16px] px-4 py-2 text-sm text-[var(--ui-color-primary)]">
                Blocks
              </Button>
            ) : null}
            <Button variant="secondary" icon={<Settings2 size={16} />} onClick={onOpenPreferences} className="min-h-10 rounded-[16px] px-4 py-2 text-sm">
              Preferences
            </Button>
            <ThemeToggle className="h-10 rounded-[16px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 text-[var(--ui-color-text)]" showLabel />
          </div>

          {showPanelControls ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] p-1.5 shadow-[0_18px_40px_-30px_rgba(26,41,72,0.18)]">
              <ThemeToggle className="h-10 w-10 items-center justify-center rounded-[12px] border-[color:var(--ui-border-soft)] bg-transparent text-[color:var(--ui-color-text)] hover:bg-[color:var(--ui-border-soft)] hover:text-[var(--ui-color-text)]" showLabel={false} />
              {showLeftToggle ? (
                <button
                  type="button"
                  onClick={onToggleLeft}
                  className={utilityButtonClass}
                  title={leftCollapsed ? "Show left panel" : "Hide left panel"}
                >
                  {leftCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onToggleRight}
                className={utilityButtonClass}
                title={rightCollapsed ? "Show right panel" : "Hide right panel"}
              >
                {rightCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
              </button>
              <button
                type="button"
                onClick={onToggleBottom}
                className={utilityButtonClass}
                title={bottomCollapsed ? "Show output panel" : "Hide output panel"}
              >
                {bottomCollapsed ? <PanelBottomOpen size={15} /> : <PanelBottomClose size={15} />}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </motion.header>
  );
}









