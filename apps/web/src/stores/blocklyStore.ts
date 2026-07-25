"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ToolboxLearningLevel } from "@/lib/blockly/guidedToolbox";

const BLOCKLY_CODE_PANEL_MIN_WIDTH = 280;
const BLOCKLY_CODE_PANEL_DEFAULT_WIDTH = 340;
const BLOCKLY_CODE_PANEL_MAX_WIDTH = 520;
const BLOCKLY_STORAGE_KEY = "edtech:blockly-ui-state";

interface BlocklyStoreState {
  selectedCategoryName: string;
  showCodePanel: boolean;
  codePanelWidth: number;
  isCodePanelResizing: boolean;
  generatedPreviewCode: string;
  previewWarning: string | null;
  isCategoryManagerOpen: boolean;
  hiddenCategoryIds: string[];
  categoryManagerDraft: string[];
  blockCount: number;
  categoryQuery: string;
  isFlyoutVisible: boolean;
  toolboxLearningLevel: ToolboxLearningLevel;
}

interface BlocklyStoreActions {
  setSelectedCategoryName: (category: string) => void;
  setShowCodePanel: (value: boolean | ((current: boolean) => boolean)) => void;
  setCodePanelWidth: (width: number) => void;
  setIsCodePanelResizing: (value: boolean) => void;
  setGeneratedPreviewCode: (code: string | ((current: string) => string)) => void;
  setPreviewWarning: (warning: string | null | ((current: string | null) => string | null)) => void;
  setIsCategoryManagerOpen: (value: boolean) => void;
  setHiddenCategoryIds: (ids: string[] | ((current: string[]) => string[])) => void;
  setCategoryManagerDraft: (ids: string[] | ((current: string[]) => string[])) => void;
  setBlockCount: (count: number) => void;
  setCategoryQuery: (query: string) => void;
  setIsFlyoutVisible: (value: boolean) => void;
  setToolboxLearningLevel: (level: ToolboxLearningLevel) => void;
  resetBlocklyState: () => void;
}

export type BlocklyStore = BlocklyStoreState & BlocklyStoreActions;

function clampCodePanelWidth(width: number) {
  return Math.min(BLOCKLY_CODE_PANEL_MAX_WIDTH, Math.max(BLOCKLY_CODE_PANEL_MIN_WIDTH, width));
}

function stringArrayEqual(left: string[], right: string[]) {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

const initialState: BlocklyStoreState = {
  selectedCategoryName: "start",
  showCodePanel: false,
  codePanelWidth: BLOCKLY_CODE_PANEL_DEFAULT_WIDTH,
  isCodePanelResizing: false,
  generatedPreviewCode: "",
  previewWarning: null,
  isCategoryManagerOpen: false,
  hiddenCategoryIds: [],
  categoryManagerDraft: [],
  blockCount: 0,
  categoryQuery: "",
  isFlyoutVisible: true,
  toolboxLearningLevel: "explore",
};

export const useBlocklyStore = create<BlocklyStore>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedCategoryName: (category) =>
        set((state) => (state.selectedCategoryName === category ? state : { selectedCategoryName: category })),

      setShowCodePanel: (value) =>
        set((state) => {
          const next = typeof value === "function" ? value(state.showCodePanel) : value;
          return state.showCodePanel === next ? state : { showCodePanel: next };
        }),

      setCodePanelWidth: (width) =>
        set((state) => {
          const next = clampCodePanelWidth(width);
          return state.codePanelWidth === next ? state : { codePanelWidth: next };
        }),

      setIsCodePanelResizing: (value) =>
        set((state) => (state.isCodePanelResizing === value ? state : { isCodePanelResizing: value })),

      setGeneratedPreviewCode: (code) =>
        set((state) => {
          const next = typeof code === "function" ? code(state.generatedPreviewCode) : code;
          return state.generatedPreviewCode === next ? state : { generatedPreviewCode: next };
        }),

      setPreviewWarning: (warning) =>
        set((state) => {
          const next = typeof warning === "function" ? warning(state.previewWarning) : warning;
          return state.previewWarning === next ? state : { previewWarning: next };
        }),

      setIsCategoryManagerOpen: (value) =>
        set((state) => (state.isCategoryManagerOpen === value ? state : { isCategoryManagerOpen: value })),

      setHiddenCategoryIds: (ids) =>
        set((state) => {
          const next = typeof ids === "function" ? ids(state.hiddenCategoryIds) : ids;
          return stringArrayEqual(state.hiddenCategoryIds, next) ? state : { hiddenCategoryIds: next };
        }),

      setCategoryManagerDraft: (ids) =>
        set((state) => {
          const next = typeof ids === "function" ? ids(state.categoryManagerDraft) : ids;
          return stringArrayEqual(state.categoryManagerDraft, next) ? state : { categoryManagerDraft: next };
        }),

      setBlockCount: (count) =>
        set((state) => (state.blockCount === count ? state : { blockCount: count })),

      setCategoryQuery: (query) =>
        set((state) => (state.categoryQuery === query ? state : { categoryQuery: query })),

      setIsFlyoutVisible: (value) =>
        set((state) => (state.isFlyoutVisible === value ? state : { isFlyoutVisible: value })),

      setToolboxLearningLevel: (level) =>
        set((state) => (state.toolboxLearningLevel === level ? state : { toolboxLearningLevel: level })),

      resetBlocklyState: () =>
        set({
          ...initialState,
          showCodePanel: initialState.showCodePanel,
          codePanelWidth: initialState.codePanelWidth,
          hiddenCategoryIds: initialState.hiddenCategoryIds,
        }),
    }),
    {
      name: BLOCKLY_STORAGE_KEY,
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        showCodePanel: state.showCodePanel,
        codePanelWidth: state.codePanelWidth,
        hiddenCategoryIds: state.hiddenCategoryIds,
        selectedCategoryName: state.selectedCategoryName,
        toolboxLearningLevel: state.toolboxLearningLevel,
      }),
    },
  ),
);
