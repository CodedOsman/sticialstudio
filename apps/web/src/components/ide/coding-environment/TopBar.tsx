"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Blocks, CheckCircle2, Code2, Play, Plus, Rocket, RotateCcw, Save, Settings2, Square } from 'lucide-react';
import type { CodingMode } from '@/contexts/BoardContext';
import { Button } from '@/components/ui/Button';
import { fadeInUp } from '@/components/ui/motion';
import ThemeToggle from '@/components/layout/ThemeToggle';

interface CodingEnvironmentTopBarProps {
  projectName: string;
  boardName: string;
  codingMode: CodingMode;
  isSimulationActive: boolean;
  isSimulationBusy: boolean;
  supportsSimulation: boolean;
  canUploadAndSimulate: boolean;
  canResetSimulation: boolean;
  componentCount: number;
  mappedPinCount: number;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isCompiling?: boolean;
  onBackToCircuitLab: () => void;
  onChangeCodingMode: (mode: Exclude<CodingMode, null>) => void;
  onUploadAndSimulate: () => void;
  onStopSimulation: () => void;
  onResetSimulation: () => void;
  onSaveProject: () => void;
  onNewSketch: () => void;
  onOpenPreferences: () => void;
  onVerify?: () => void;
  onUpload?: () => void;
  saveStatusText?: string | null;
  saveStatusTone?: 'neutral' | 'success' | 'error';
}

export default function CodingEnvironmentTopBar({
  projectName,
  boardName,
  codingMode,
  isSimulationActive,
  isSimulationBusy,
  supportsSimulation,
  canUploadAndSimulate,
  canResetSimulation,
  componentCount,
  mappedPinCount,
  hasUnsavedChanges,
  isSaving,
  isCompiling = false,
  onBackToCircuitLab,
  onChangeCodingMode,
  onUploadAndSimulate,
  onStopSimulation,
  onResetSimulation,
  onSaveProject,
  onNewSketch,
  onOpenPreferences,
  onVerify,
  onUpload,
  saveStatusText,
  saveStatusTone = 'neutral',
}: CodingEnvironmentTopBarProps) {
  const activeMode = codingMode === 'text' ? 'text' : 'block';
  const simulationDisabled = !supportsSimulation || isSimulationBusy || (!isSimulationActive && !canUploadAndSimulate);
  const saveStatusClass =
    saveStatusTone === 'success'
      ? 'border-emerald-400/20 bg-emerald-400/12 text-emerald-200'
      : saveStatusTone === 'error'
        ? 'border-rose-400/24 bg-rose-400/12 text-rose-100'
        : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text-soft)]';

  if (activeMode === 'block') {
    return (
      <motion.header
        className='overflow-hidden rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] shadow-[0_24px_64px_-44px_rgba(0,0,0,1)]'
        variants={fadeInUp}
        initial='hidden'
        animate='visible'
      >
        <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5'>
          <div className='flex min-w-0 flex-col gap-3'>
            <div className='flex min-w-0 flex-wrap items-center gap-2'>
              <div className='inline-flex items-center gap-1 rounded-[16px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] p-1.5'>
                <button
                  type='button'
                  onClick={() => onChangeCodingMode('block')}
                  className='inline-flex items-center gap-2 rounded-[12px] bg-[linear-gradient(180deg,#656cf8_0%,#4f56e8_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_16px_32px_-22px_rgba(101,108,248,0.8)] transition-all'
                >
                  <Blocks size={14} />
                  Blocks
                </button>
                <button
                  type='button'
                  onClick={() => onChangeCodingMode('text')}
                  className='inline-flex items-center gap-2 rounded-[12px] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ui-color-text-soft)] transition-all hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
                >
                  <Code2 size={14} />
                  Text
                </button>
              </div>
              <span className='rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ui-color-text-soft)]'>
                {boardName}
              </span>
              {saveStatusText ? <span className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${saveStatusClass}`}>{saveStatusText}</span> : null}
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${componentCount > 0 ? 'border-emerald-300/24 bg-emerald-400/12 text-emerald-100' : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text-soft)]'}`}>
                1 Build
              </span>
              <span className='rounded-full border border-violet-300/24 bg-violet-400/14 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-100'>
                2 Code
              </span>
              <span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${canUploadAndSimulate || isSimulationActive ? 'border-cyan-300/24 bg-cyan-400/12 text-cyan-100' : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] text-[color:var(--ui-color-text-soft)]'}`}>
                3 Run
              </span>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='secondary'
              icon={<ArrowLeft size={16} />}
              onClick={onBackToCircuitLab}
              className='min-h-11 rounded-[16px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-4 py-2 text-sm text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
            >
              Back to Circuit
            </Button>
            <Button
              variant='secondary'
              icon={<Save size={16} />}
              onClick={onSaveProject}
              disabled={isSaving}
              className='min-h-11 rounded-[16px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-4 py-2 text-sm text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant='secondary'
              icon={<Plus size={16} />} 
              onClick={onNewSketch}
              className='min-h-11 rounded-[16px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-4 py-2 text-sm text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
            >
              New Sketch
            </Button>
            <Button
              variant='secondary'
              icon={<RotateCcw size={16} />}
              onClick={onResetSimulation}
              disabled={!canResetSimulation}
              className='min-h-11 rounded-[16px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-4 py-2 text-sm text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
            >
              Reset
            </Button>
            <Button
              variant='secondary'
              icon={<Settings2 size={16} />}
              onClick={onOpenPreferences}
              className='min-h-11 rounded-[16px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-4 py-2 text-sm text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
            >
              Preferences
            </Button>
            <Button
              icon={isSimulationActive ? <Square size={16} /> : <Play size={16} />}
              onClick={() => {
                if (isSimulationActive) {
                  onStopSimulation();
                } else {
                  onUploadAndSimulate();
                }
              }}
              disabled={simulationDisabled}
              className={`min-h-11 rounded-[16px] px-4 py-2 text-sm text-white ${
                isSimulationActive
                  ? 'border border-rose-300/24 bg-[linear-gradient(180deg,#e2567b_0%,#cc466c_100%)] hover:bg-[linear-gradient(180deg,#eb5e83_0%,#d54d73_100%)]'
                  : 'border border-indigo-300/24 bg-[linear-gradient(180deg,#656cf8_0%,#4f56e8_100%)] hover:bg-[linear-gradient(180deg,#7278ff_0%,#5a61ef_100%)]'
              }`}
            >
              {isSimulationBusy && !isSimulationActive
                ? 'Preparing...'
                : isSimulationActive
                  ? 'Stop Simulation'
                  : 'Run Simulation'}
            </Button>
          </div>
        </div>
      </motion.header>
    );
  }

  return (
    <motion.header
      className='flex-shrink-0 overflow-hidden rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] shadow-[0_24px_64px_-44px_rgba(0,0,0,1)]'
      variants={fadeInUp}
      initial='hidden'
      animate='visible'
    >
      <div className='flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-5'>
        {/* ── Left: mode switcher + board chip + status ──────────── */}
        <div className='flex min-w-0 flex-wrap items-center gap-2'>

          {/* Verify button */}
          {onVerify ? (
            <button
              type='button'
              onClick={onVerify}
              disabled={isCompiling}
              title='Verify sketch'
              className='flex h-9 items-center gap-2 rounded-[8px] border px-3.5 text-xs font-semibold transition-all disabled:opacity-50'
              style={{ background: '#1c3030', borderColor: '#2a5555', color: '#52b8c8' }}
            >
              <CheckCircle2 size={14} strokeWidth={2.2} className={isCompiling ? 'animate-pulse' : ''} />
              <span>{isCompiling ? 'Verifying…' : 'Verify'}</span>
            </button>
          ) : null}

          {/* Upload button */}
          {onUpload ? (
            <button
              type='button'
              onClick={onUpload}
              disabled={isCompiling}
              title='Upload to board'
              className='flex h-9 items-center gap-2 rounded-[8px] border px-3.5 text-xs font-semibold transition-all disabled:opacity-50'
              style={{ background: '#22224a', borderColor: '#3a3a88', color: '#a6afff' }}
            >
              <Rocket size={14} strokeWidth={2.2} />
              <span>{isCompiling ? 'Uploading…' : 'Upload'}</span>
            </button>
          ) : null}

          {/* Divider */}
          {(onVerify || onUpload) ? (
            <div className='h-5 w-px' style={{ background: '#2a3550' }} />
          ) : null}

          {/* Block / Text mode switcher */}
          <div className='inline-flex items-center gap-1 rounded-[10px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)]/80 p-0.5 shadow-inner backdrop-blur-md'>
            <button
              type='button'
              onClick={() => onChangeCodingMode('block')}
              className='relative flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--ui-color-text-soft)] transition-all hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
            >
              <Blocks size={11} className='text-indigo-400' />
              Blocks
            </button>
            <button
              type='button'
              onClick={() => onChangeCodingMode('text')}
              className='relative flex items-center gap-1.5 rounded-[8px] bg-cyan-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-md shadow-cyan-500/20 transition-all'
            >
              <Code2 size={11} className='text-white' />
              Text
            </button>
          </div>

          <span className='inline-flex items-center gap-2 text-[12px] font-medium text-sky-200/90'>
            {boardName}
          </span>

          {hasUnsavedChanges ? (
            <span className='inline-flex items-center gap-1.5 rounded-full border border-amber-300/24 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100'>
              <span className='h-1.5 w-1.5 rounded-full bg-amber-300' />
              Unsaved
            </span>
          ) : null}

          {saveStatusText ? (
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${saveStatusClass}`}>
              {saveStatusText}
            </span>
          ) : null}
        </div>

        {/* ── Right: action buttons ──────────────────────────────── */}
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='secondary'
            icon={<ArrowLeft size={14} />}
            onClick={onBackToCircuitLab}
            className='min-h-9 rounded-[12px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 py-2 text-xs text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
          >
            Circuit
          </Button>
          <Button
            variant='secondary'
            icon={<Save size={14} />}
            onClick={onSaveProject}
            disabled={isSaving}
            className='min-h-9 rounded-[12px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 py-2 text-xs text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant='secondary'
            icon={<Plus size={14} />} 
            onClick={onNewSketch}
            className='min-h-9 rounded-[12px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 py-2 text-xs text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
          >
            New Sketch
          </Button>
          <Button
            icon={isSimulationActive ? <Square size={14} /> : <Play size={14} />}
            onClick={() => {
              if (isSimulationActive) {
                onStopSimulation();
              } else {
                onUploadAndSimulate();
              }
            }}
            disabled={simulationDisabled}
            className={`min-h-9 rounded-[12px] border px-3 py-2 text-xs text-white transition-opacity ${
              isSimulationActive
                ? 'border-rose-400/30 bg-[linear-gradient(135deg,#e2567b_0%,#cc466c_100%)] hover:opacity-90'
                : 'border-indigo-400/30 bg-[linear-gradient(135deg,#656cf8,#4f56e8)] hover:opacity-90'
            }`}
          >
            {isSimulationBusy && !isSimulationActive
              ? 'Preparing…'
              : isSimulationActive
                ? 'Stop'
                : 'Simulate'}
          </Button>
          <Button
            variant='secondary'
            icon={<Settings2 size={14} />}
            onClick={onOpenPreferences}
            className='min-h-9 rounded-[12px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 py-2 text-xs text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)] hover:text-[color:var(--ui-color-text)]'
          >
            Preferences
          </Button>
          <ThemeToggle className='h-9 rounded-[12px] border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-2.5 text-[color:var(--ui-color-text-soft)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-border-soft)]' />
        </div>
      </div>
    </motion.header>
  );
}


