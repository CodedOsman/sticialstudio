"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Blocks, CircuitBoard, Code2, PlayCircle, RadioTower } from 'lucide-react';

import { fadeInUp } from '@/components/ui/motion';

import WorkspaceStageRail from './WorkspaceStageRail';

interface VirtualProjectRailProps {
  activeView: 'circuit' | 'code';
  codingMode: 'block' | 'text' | null;
  componentCount: number;
  netCount: number;
  mappedPinCount: number;
  hasCode: boolean;
  supportsSimulation: boolean;
  isSimulationActive: boolean;
  isSimulationBusy: boolean;
  onOpenCode: () => void;
  onBackToCircuit: () => void;
}

const chipClass =
  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-[color:var(--ui-color-text-soft)] bg-[color:var(--ui-color-surface-hover)] border border-[color:var(--ui-border-soft)]';

export default function VirtualProjectRail({
  activeView,
  codingMode,
  componentCount,
  netCount,
  mappedPinCount,
  hasCode,
  supportsSimulation,
  isSimulationActive,
  isSimulationBusy,
  onOpenCode,
  onBackToCircuit,
}: VirtualProjectRailProps) {
  const codingLabel = codingMode === 'text' ? 'Text' : 'Blocks';
  const buildReady = componentCount > 0;
  const simulationReady = supportsSimulation && buildReady && hasCode;

  const railItems = useMemo(
    () => [
      {
        label: 'Build',
        active: activeView === 'circuit',
        subtle: !buildReady && activeView !== 'circuit',
        icon: <CircuitBoard size={13} />,
        onClick: activeView === 'code' ? onBackToCircuit : undefined,
      },
      {
        label: codingLabel,
        active: activeView === 'code',
        subtle: !hasCode && activeView !== 'code',
        icon: codingMode === 'text' ? <Code2 size={13} /> : <Blocks size={13} />,
        onClick: activeView === 'circuit' ? onOpenCode : undefined,
      },
      {
        label: isSimulationActive ? 'Live' : 'Simulate',
        active: isSimulationActive,
        subtle: !simulationReady && !isSimulationActive,
        icon: isSimulationActive ? <RadioTower size={13} /> : <PlayCircle size={13} />,
      },
    ],
    [activeView, buildReady, codingLabel, codingMode, hasCode, isSimulationActive, onBackToCircuit, onOpenCode, simulationReady]
  );

  return (
    <motion.section
      className="mt-3 flex items-center justify-between rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 py-2"
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WorkspaceStageRail items={railItems} variant="default" className="w-fit" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={chipClass}>{componentCount} parts</span>
          <span className={chipClass}>{netCount} nets</span>
          <span className={chipClass}>{mappedPinCount} linked pins</span>
        </div>
      </div>
    </motion.section>
  );
}
