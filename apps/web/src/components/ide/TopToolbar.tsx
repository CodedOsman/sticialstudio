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
  onSelectBoard: () => void;
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
  "inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[color:var(--ui-border-soft)] bg-white/82 text-[var(--ui-color-text-soft)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--ui-border-strong)] hover:text-[var(--ui-color-primary)]";

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
  onSelectBoard,
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
        : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-elevated)] text-[var(--ui-color-text-muted)]";

  const isBlockWorkspace = codingMode === "block";

  if (variant === "arduino-text") {
    return (
      <motion.header
        className="z-10 flex-shrink-0 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)]/95 backdrop-blur-xl"
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
              className="flex h-9 items-center gap-2 rounded-[10px] border border-emerald-400/18 bg-emerald-400/18 px-4 text-[12px] font-semibold tracking-[0.02em] text-emerald-50 shadow-[0_14px_26px_-18px_rgba(16,185,129,0.65)] transition-all hover:-translate-y-0.5 hover:bg-emerald-400/24 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <CheckCircle2 size={14} strokeWidth={2.5} className={isCompiling ? "animate-spin" : ""} />
              {isCompiling ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={onUpload}
              disabled={isCompiling}
              title="Upload sketch (Ctrl+U)"
              className="flex h-9 items-center gap-2 rounded-[10px] border border-[color:var(--ui-color-primary)]/26 bg-[color:var(--ui-color-primary)] px-4 text-[12px] font-semibold tracking-[0.02em] text-white shadow-[0_16px_28px_-18px_rgba(139,92,246,0.72)] transition-all hover:-translate-y-0.5 hover:bg-[color:var(--ui-color-primary)]/90 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <Rocket size={14} strokeWidth={2.5} />
              {isCompiling ? "Uploading..." : "Upload"}
            </button>

            <div className="h-5 w-px bg-[color:var(--ui-border-soft)]" />

            <button
              type="button"
              onClick={onSelectBoard}
              className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-elevated)] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-color-text)] transition-all hover:border-[color:var(--ui-color-primary)]/40 hover:text-[var(--ui-color-primary)]"
            >
              <span className="max-w-[140px] truncate">{boardName}</span>
              <ChevronDown size={12} className="opacity-70" />
            </button>

            {saveStatusText ? (
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${saveStatusClass}`}>
                {saveStatusText}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onSaveProject}
              className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-medium text-[var(--ui-color-text-muted)] transition-all hover:bg-[color:var(--ui-surface-elevated)] hover:text-[var(--ui-color-text)]"
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
                  : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-elevated)] text-[var(--ui-color-text-muted)] hover:text-[var(--ui-color-text)]"
              }`}
            >
              {isConnected ? <Link2 size={14} /> : <Link2Off size={14} />}
              {isConnected ? "Disconnect" : "Connect"}
            </button>

            <div className="mx-1 h-4 w-px bg-[color:var(--ui-border-soft)]" />

            <button
              type="button"
              onClick={onOpenProject}
              className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-medium text-[var(--ui-color-text-muted)] transition-all hover:bg-[color:var(--ui-surface-elevated)] hover:text-[var(--ui-color-text)]"
            >
              <FolderOpen size={14} />
              Dashboard
            </button>

            <button
              type="button"
              onClick={onNewSketch}
              className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-medium text-[var(--ui-color-text-muted)] transition-all hover:bg-[color:var(--ui-surface-elevated)] hover:text-[var(--ui-color-text)]"
            >
              <Plus size={14} />
              New Sketch
            </button>

            <button
              type="button"
              onClick={onOpenPreferences}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--ui-color-text-soft)] transition-all hover:bg-[color:var(--ui-surface-elevated)] hover:text-[var(--ui-color-text)]"
              title="Preferences"
            >
              <Settings2 size={14} />
            </button>
            <ThemeToggle className="h-9 rounded-[10px] px-2 text-[var(--ui-color-text-soft)] hover:bg-[color:var(--ui-surface-elevated)] hover:text-[var(--ui-color-text)]" />
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
        className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#10131f_0%,#0a0d18_100%)] shadow-[0_30px_90px_-52px_rgba(0,0,0,1)]"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        <div className="px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <button 
                type="button"
                onClick={onOpenProject} 
                className="text-[1.2rem] font-bold tracking-[-0.05em] text-white transition-opacity hover:opacity-80 text-left focus:outline-none"
                title="Go to Dashboard"
              >
                Sticial Studio
              </button>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                <Sparkles size={12} className="text-indigo-300" />
                Block Coding
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                <Sparkles size={12} className="text-sky-300" />
                {boardName}
              </span>
              <span
                className={`${chipBaseClass} ${
                  isConnected
                    ? "border-emerald-400/18 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/[0.04] text-slate-300"
                }`}
              >
                {isConnected ? <Link2 size={12} /> : <Link2Off size={12} />}
                {isConnected ? "Connected" : "Not connected"}
              </span>
              {saveStatusText ? <span className={`${chipBaseClass} ${saveStatusClass}`}>{saveStatusText}</span> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                icon={<FolderOpen size={14} />}
                onClick={onOpenProject}
                className="min-h-10 rounded-[14px] border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              >
                Dashboard
              </Button>
              <Button
                variant="secondary"
                icon={<Plus size={14} />}
                onClick={onNewSketch}
                className="min-h-10 rounded-[14px] border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              >
                New Sketch
              </Button>
              <Button
                variant="secondary"
                icon={<Save size={14} />}
                onClick={onSaveProject}
                disabled={isSaving}
                className="min-h-10 rounded-[14px] border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              >
                {isSaving ? "Saving..." : "Save"}
                {hasUnsavedChanges ? <span className="ml-1 h-2 w-2 rounded-full bg-amber-300" /> : null}
              </Button>
              <Button
                variant="secondary"
                icon={<CheckCircle2 size={14} />}
                onClick={onVerify}
                disabled={isCompiling}
                className="min-h-10 rounded-[14px] border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              >
                {isCompiling ? "Verifying..." : "Verify"}
              </Button>
              <Button
                icon={<Rocket size={14} />}
                onClick={onUpload}
                disabled={isCompiling}
                className="min-h-10 rounded-[14px] border border-indigo-400/30 bg-[linear-gradient(135deg,#656cf8,#4f56e8)] px-3 py-2 text-sm text-white hover:opacity-90"
              >
                {isCompiling ? "Working..." : "Upload to Board"}
              </Button>
              <Button
                variant="secondary"
                icon={isConnected ? <Link2Off size={14} /> : <Link2 size={14} />}
                onClick={onConnectDevice}
                className="min-h-10 rounded-[14px] border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              >
                {isConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </div>
          {serialError ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-[16px] border border-rose-400/24 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
              <AlertCircle size={14} />
              <span>{serialError}</span>
            </div>
          ) : null}
        </div>
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
              <span className={`${chipBaseClass} border-[color:var(--ui-border-soft)] bg-white/80 text-[var(--ui-color-text-soft)]`}>
                <Sparkles size={13} className={isBlockWorkspace ? "text-[var(--ui-color-primary)]" : "text-[var(--ui-color-accent)]"} />
                {isBlockWorkspace ? "Blocks" : "Code"}
              </span>
            ) : (
              <span className={`${chipBaseClass} border-[color:var(--ui-border-soft)] bg-white/80 text-[var(--ui-color-text-soft)]`}>
                <Sparkles size={13} className="text-[var(--ui-color-accent)]" />
                {isBlockWorkspace ? "Blocks" : "Code"}
              </span>
            )}
            <span className={`${chipBaseClass} border-[color:var(--ui-border-soft)] bg-white/80 text-[var(--ui-color-text-soft)]`}>
              {boardName}
            </span>
            <span className={`${chipBaseClass} border-[color:var(--ui-border-soft)] bg-white/80 text-[var(--ui-color-text-soft)]`}>
              {environment}
            </span>
            <span
              className={`${chipBaseClass} ${
                isConnected
                  ? "border-[color:var(--ui-color-success)]/20 bg-[color:var(--ui-color-success)]/10 text-[color:var(--ui-color-success)]"
                  : "border-[color:var(--ui-border-soft)] bg-white/82 text-[var(--ui-color-text-soft)]"
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
            <Button variant="secondary" icon={<FolderOpen size={16} />} onClick={onOpenProject} className="min-h-10 rounded-[16px] px-4 py-2 text-sm">
              Dashboard
            </Button>
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
            <Button variant="secondary" icon={<ChevronDown size={16} />} onClick={onSelectBoard} className="min-h-10 rounded-[16px] px-4 py-2 text-sm">
              Board
            </Button>
            {onChangeCodingMode && !isBlockWorkspace ? (
              <Button variant="secondary" icon={<Sparkles size={16} />} onClick={() => onChangeCodingMode("block")} className="min-h-10 rounded-[16px] px-4 py-2 text-sm text-[var(--ui-color-primary)]">
                Blocks
              </Button>
            ) : null}
            <Button variant="secondary" icon={<Settings2 size={16} />} onClick={onOpenPreferences} className="min-h-10 rounded-[16px] px-4 py-2 text-sm">
              Preferences
            </Button>
            <ThemeToggle className="h-10 rounded-[16px] border-[color:var(--ui-border-soft)] bg-white/82 px-3 text-[var(--ui-color-text)]" showLabel />
          </div>

          {showPanelControls ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[color:var(--ui-border-soft)] bg-white/70 p-1.5 shadow-[0_18px_40px_-30px_rgba(26,41,72,0.18)]">
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









