import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { BlockTerminalTab } from '../BlockTerminalShell';
import type { CodingMode } from '@/contexts/BoardContext';

type EventPayloads = {
  'project:save-request': { origin: 'manual' | 'auto' };
  'compile:verify-request': undefined;
  'compile:upload-request': undefined;
  'device:connect-toggle-request': undefined;
  'layout:block-terminal-request': { tab: BlockTerminalTab; open?: boolean };
  'editor:runtime-sync-request': undefined;
  'editor:coding-mode-request': { mode: Exclude<CodingMode, null> };
  'app:reset-request': undefined;
  BLOCKLY_CHANGED: { xml: string };
  CODE_GENERATED: { code: string; warning: string | null };
  FILE_SAVED: { origin: 'manual' | 'auto' | 'create'; projectId: string | null; projectName: string };
  USER_EDITED: { source: 'text' | 'blockly' | 'file-tree' | 'project-meta'; timestamp: number };
};

type EventKey = keyof EventPayloads;
type EventHandler<K extends EventKey> = (payload: EventPayloads[K]) => void;

export interface SplitViewEventBus {
  emit<K extends EventKey>(event: K, payload: EventPayloads[K]): void;
  subscribe<K extends EventKey>(event: K, handler: EventHandler<K>): () => void;
  on<K extends EventKey>(event: K, handler: EventHandler<K>): () => void;
}

const GUARDED_EVENTS = new Set<EventKey>(['BLOCKLY_CHANGED', 'CODE_GENERATED']);

function deepEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) {
    return true;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function createSplitViewEventBus(): SplitViewEventBus {
  const listeners = new Map<EventKey, Set<(payload: unknown) => void>>();
  const lastPayloadByEvent = new Map<EventKey, unknown>();

  const subscribe = <K extends EventKey>(event: K, handler: EventHandler<K>) => {
    const handlers = listeners.get(event) ?? new Set();
    handlers.add(handler as (payload: unknown) => void);
    listeners.set(event, handlers);
    return () => {
      const current = listeners.get(event);
      if (!current) return;
      current.delete(handler as (payload: unknown) => void);
      if (current.size === 0) {
        listeners.delete(event);
      }
    };
  };

  return {
    emit(event, payload) {
      if (GUARDED_EVENTS.has(event) && lastPayloadByEvent.has(event) && deepEqual(lastPayloadByEvent.get(event), payload)) {
        return;
      }

      if (GUARDED_EVENTS.has(event)) {
        lastPayloadByEvent.set(event, payload);
      }

      const handlers = listeners.get(event);
      if (!handlers) return;
      handlers.forEach((handler) => handler(payload));
    },
    subscribe,
    on: subscribe,
  };
}

const SplitViewEventBusContext = createContext<SplitViewEventBus | null>(null);

export function SplitViewEventBusProvider({ children }: { children: ReactNode }) {
  const [eventBus] = useState<SplitViewEventBus>(() => createSplitViewEventBus());

  return <SplitViewEventBusContext.Provider value={eventBus}>{children}</SplitViewEventBusContext.Provider>;
}

export function useSplitViewEventBus() {
  const context = useContext(SplitViewEventBusContext);
  if (!context) {
    throw new Error('useSplitViewEventBus must be used within SplitViewEventBusProvider');
  }
  return context;
}

