import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
export type StudioView = 'code' | 'circuit' | 'split';
import type { BlockTerminalTab } from '../../BlockTerminalShell';
import {
  BLOCK_TERMINAL_COLLAPSED_STORAGE_KEY,
  BLOCK_TERMINAL_DEFAULT_HEIGHT,
  BLOCK_TERMINAL_HEIGHT_STORAGE_KEY,
  BLOCK_TERMINAL_TAB_STORAGE_KEY,
} from '../constants';
import { clampBlockTerminalHeight, getInitialStudioView } from '../helpers';
import { useSplitViewEventBus } from '../SplitViewEventBus';

const RIGHT_EDITOR_FOCUS_THRESHOLD = 20;
const LEFT_EDITOR_FOCUS_THRESHOLD = 26;

interface UseIDELayoutStateOptions {
  environment: string;
  isBlockMode: boolean;
  supportsDeviceFiles: boolean;
  editorFontSize: number;
}

export function useIDELayoutState({ environment, isBlockMode, supportsDeviceFiles, editorFontSize }: UseIDELayoutStateOptions) {
  const eventBus = useSplitViewEventBus();
  const [terminalHeight, setTerminalHeight] = useState(BLOCK_TERMINAL_DEFAULT_HEIGHT);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [blockTerminalTab, setBlockTerminalTab] = useState<BlockTerminalTab>('serial');
  const [hasLoadedBlockTerminalPrefs, setHasLoadedBlockTerminalPrefs] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [leftRailView, setLeftRailView] = useState('files');
  const [rightPanelView, setRightPanelView] = useState('status');
  const autoFocusCollapsedLeftRef = useRef(false);
  const autoFocusCollapsedRightRef = useRef(false);
  const leftFocusThresholdReachedRef = useRef(false);
  const rightFocusThresholdReachedRef = useRef(false);

  // One-shot override: the wizard stores 'edtech:ide-start-view' in sessionStorage
  // when the user explicitly picked a coding mode (not from Circuit Lab).
  // We consume it exactly once here so the env-reset effect below doesn't clobber it.
  const startViewOverrideRef = useRef(false);
  const [activeView, setActiveView] = useState<StudioView>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem('edtech:ide-start-view');
      if (stored === 'code' || stored === 'circuit') {
        window.sessionStorage.removeItem('edtech:ide-start-view');
        startViewOverrideRef.current = true;
        return stored as StudioView;
      }
    }
    return getInitialStudioView(environment);
  });

  const defaultRightView = supportsDeviceFiles ? 'device' : 'ai-chat';
  const effectiveBlockTerminalHeight = isCompact ? Math.min(terminalHeight, 180) : terminalHeight;

  const setStudioView = useCallback(
    (view: StudioView) => {
      if (view === activeView) return;
      if (view === 'code') {
        eventBus.emit('editor:runtime-sync-request', undefined);
      }
      setActiveView(view);

    },
    [activeView, eventBus],
  );

  useEffect(() => {
    // If we consumed a start-view override from the wizard on this mount,
    // skip the first run so we don't immediately clobber it.
    if (startViewOverrideRef.current) {
      startViewOverrideRef.current = false;
      return;
    }
    const nextView = getInitialStudioView(environment);
    setActiveView(nextView);
    if (nextView === 'code') {
      eventBus.emit('editor:runtime-sync-request', undefined);
    }

  }, [environment, eventBus]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isBlockMode) {
      setHasLoadedBlockTerminalPrefs(false);
      return;
    }

    const storedHeight = window.localStorage.getItem(BLOCK_TERMINAL_HEIGHT_STORAGE_KEY);
    if (storedHeight) {
      const parsedHeight = Number.parseInt(storedHeight, 10);
      if (Number.isFinite(parsedHeight)) {
        setTerminalHeight(clampBlockTerminalHeight(parsedHeight));
      }
    }

    const storedCollapsed = window.localStorage.getItem(BLOCK_TERMINAL_COLLAPSED_STORAGE_KEY);
    if (storedCollapsed === 'true' || storedCollapsed === 'false') {
      setBottomCollapsed(storedCollapsed === 'true');
    } else {
      setBottomCollapsed(false); // Auto show by default
    }

    const storedTab = window.localStorage.getItem(BLOCK_TERMINAL_TAB_STORAGE_KEY);
    if (storedTab === 'serial' || storedTab === 'build' || storedTab === 'connection') {
      setBlockTerminalTab(storedTab);
    }

    setHasLoadedBlockTerminalPrefs(true);
  }, [isBlockMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isBlockMode || !hasLoadedBlockTerminalPrefs) {
      return;
    }

    window.localStorage.setItem(BLOCK_TERMINAL_HEIGHT_STORAGE_KEY, String(clampBlockTerminalHeight(terminalHeight)));
    window.localStorage.setItem(BLOCK_TERMINAL_COLLAPSED_STORAGE_KEY, String(bottomCollapsed));
    window.localStorage.setItem(BLOCK_TERMINAL_TAB_STORAGE_KEY, blockTerminalTab);
  }, [blockTerminalTab, bottomCollapsed, hasLoadedBlockTerminalPrefs, isBlockMode, terminalHeight]);

  useEffect(() => {
    const updateViewportMode = () => {
      const compact = window.innerWidth < 1280;
      setIsCompact(compact);

      if (compact) {
        setLeftCollapsed(true);
        setRightCollapsed(true);
        if (window.innerHeight < 820) {
          setBottomCollapsed(true);
        }
      }
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  useEffect(() => {
    if (environment !== 'physical' || isBlockMode || isCompact) {
      leftFocusThresholdReachedRef.current = false;
      rightFocusThresholdReachedRef.current = false;
      autoFocusCollapsedLeftRef.current = false;
      autoFocusCollapsedRightRef.current = false;
      return;
    }

    const shouldCollapseRightForFocus = editorFontSize >= RIGHT_EDITOR_FOCUS_THRESHOLD;
    const shouldCollapseLeftForFocus = editorFontSize >= LEFT_EDITOR_FOCUS_THRESHOLD;

    if (shouldCollapseRightForFocus && !rightFocusThresholdReachedRef.current) {
      if (!rightCollapsed) {
        setRightCollapsed(true);
        autoFocusCollapsedRightRef.current = true;
      } else {
        autoFocusCollapsedRightRef.current = false;
      }
    } else if (!shouldCollapseRightForFocus && rightFocusThresholdReachedRef.current && autoFocusCollapsedRightRef.current) {
      setRightCollapsed(false);
      autoFocusCollapsedRightRef.current = false;
    }

    if (shouldCollapseLeftForFocus && !leftFocusThresholdReachedRef.current) {
      if (!leftCollapsed) {
        setLeftCollapsed(true);
        autoFocusCollapsedLeftRef.current = true;
      } else {
        autoFocusCollapsedLeftRef.current = false;
      }
    } else if (!shouldCollapseLeftForFocus && leftFocusThresholdReachedRef.current && autoFocusCollapsedLeftRef.current) {
      setLeftCollapsed(false);
      autoFocusCollapsedLeftRef.current = false;
    }

    rightFocusThresholdReachedRef.current = shouldCollapseRightForFocus;
    leftFocusThresholdReachedRef.current = shouldCollapseLeftForFocus;
  }, [editorFontSize, environment, isBlockMode, isCompact, leftCollapsed, rightCollapsed]);

  useEffect(() => {
    if (!isBlockMode) {
      setRightPanelView(defaultRightView);
      if (!isCompact) {
        setBottomCollapsed(environment === 'virtual');
      }
    }
  }, [defaultRightView, environment, isBlockMode, isCompact]);

  useEffect(() => {
    return eventBus.on('layout:block-terminal-request', ({ tab, open = true }) => {
      setBlockTerminalTab(tab);
      if (open) {
        setBottomCollapsed(false);
      }
    });
  }, [eventBus]);

  useEffect(() => {
    return eventBus.on('app:reset-request', () => {
      setTerminalHeight(BLOCK_TERMINAL_DEFAULT_HEIGHT);
      setLeftCollapsed(false);
      setRightCollapsed(false);
      setBottomCollapsed(false);
      setBlockTerminalTab('serial');
      setLeftRailView('files');
      setRightPanelView('status');
      setActiveView(getInitialStudioView('virtual'));
      autoFocusCollapsedLeftRef.current = false;
      autoFocusCollapsedRightRef.current = false;
      leftFocusThresholdReachedRef.current = false;
      rightFocusThresholdReachedRef.current = false;

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(BLOCK_TERMINAL_HEIGHT_STORAGE_KEY);
        window.localStorage.removeItem(BLOCK_TERMINAL_COLLAPSED_STORAGE_KEY);
        window.localStorage.removeItem(BLOCK_TERMINAL_TAB_STORAGE_KEY);
      }
    });
  }, [eventBus]);

  const handleTerminalResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = terminalHeight;

      const onMove = (moveEvent: MouseEvent) => {
        const delta = startY - moveEvent.clientY;
        setTerminalHeight(clampBlockTerminalHeight(startHeight + delta));
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [terminalHeight],
  );

  const toggleLeftCollapsed = useCallback(() => {
    autoFocusCollapsedLeftRef.current = false;
    setLeftCollapsed((prev) => !prev);
  }, []);

  const toggleRightCollapsed = useCallback(() => {
    autoFocusCollapsedRightRef.current = false;
    setRightCollapsed((prev) => !prev);
  }, []);

  return {
    activeView,
    setStudioView,
    terminalHeight,
    effectiveBlockTerminalHeight,
    leftCollapsed,
    setLeftCollapsed,
    rightCollapsed,
    setRightCollapsed,
    bottomCollapsed,
    setBottomCollapsed,
    blockTerminalTab,
    setBlockTerminalTab,
    isCompact,
    leftRailView,
    setLeftRailView,
    rightPanelView,
    setRightPanelView,
    handleTerminalResize,
    defaultRightView,
    toggleLeftCollapsed,
    toggleRightCollapsed,
  };
}
