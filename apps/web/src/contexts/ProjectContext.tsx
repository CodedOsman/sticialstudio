"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useBoard } from "./BoardContext";
import { apiFetch, safeJson } from "@/lib/api";
import { parseProjectMeta } from "@/lib/projects/projectMeta";
import {
  buildProjectPayload,
  getStoredActiveProjectId,

  persistActiveProjectId,
  resolveProjectFilesState,
  type PersistedProjectRecord,
  UNTITLED_PROJECT_NAME,
} from "@/lib/projects/projectPersistence";
import { DEFAULT_ARDUINO_CODE, DEFAULT_MICROPYTHON_CODE } from "@/templates/codeTemplates";

import { useBlocklyStore } from "@/stores/blocklyStore";
import { useEditorStore, type FileItem } from "@/stores/editorStore";


export type { FileItem } from "@/stores/editorStore";

export interface ProjectContextValue {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  hasLoadedProjectFiles: boolean;
  refreshProjectFiles: () => Promise<void>;
  saveProject: () => Promise<void>;
  saveAsProject: (name: string) => Promise<string>;
  startNewSketch: () => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

function stashWorkspaceNotice(message: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("workspaceNotice", message);
}

function resolvePreferredSourceFileName(language: string | null, generator: string | null) {
  return language === "python" || generator === "micropython" ? "main.py" : "main.cpp";
}

function resolveStarterSourceCode(codingMode: "block" | "text" | null, language: string | null, generator: string | null) {
  if (codingMode === "block") {
    return "";
  }

  return language === "python" || generator === "micropython"
    ? DEFAULT_MICROPYTHON_CODE
    : DEFAULT_ARDUINO_CODE;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectIdState] = useState<string | null>(() => getStoredActiveProjectId());
  const [projectNameState, setProjectNameState] = useState(UNTITLED_PROJECT_NAME);
  const [hasLoadedProjectFiles, setHasLoadedProjectFiles] = useState(() => !getStoredActiveProjectId());
  const filesRef = useRef<FileItem[]>(useEditorStore.getState().files);
  const activeFileIdRef = useRef<string | null>(useEditorStore.getState().activeFileId);
  const token = 'local';
  const {
    currentBoard,
    codingMode,
    language,
    generator,
    environment,
    setCurrentBoard,
    setCodingMode,
    setLanguage,
    setGenerator,
    setEnvironment,
    clearPendingProjectIntent,
  } = useBoard();

  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state) => {
      filesRef.current = state.files;
      activeFileIdRef.current = state.activeFileId;
    });

    return unsubscribe;
  }, []);

  const applyProjectMetaToBoardContext = useCallback(
    (projectRecord: PersistedProjectRecord) => {
      const projectMeta = parseProjectMeta(projectRecord);
      if (!projectMeta) {
        return { language, generator };
      }

      if (projectMeta.board !== currentBoard) setCurrentBoard(projectMeta.board as any);
      if (projectMeta.mode !== codingMode) setCodingMode(projectMeta.mode);
      if (projectMeta.language !== language) setLanguage(projectMeta.language);
      if (projectMeta.generator !== generator) setGenerator(projectMeta.generator);
      if (projectMeta.environment && projectMeta.environment !== environment) setEnvironment(projectMeta.environment);

      return {
        language: projectMeta.language ?? language,
        generator: projectMeta.generator ?? generator,
      };
    },
    [codingMode, currentBoard, environment, generator, language, setCodingMode, setCurrentBoard, setEnvironment, setGenerator, setLanguage],
  );

  const buildCurrentProjectFiles = useCallback(
    () => filesRef.current,
    [],
  );

  const buildCurrentProjectPayload = useCallback(
    () =>
      buildProjectPayload({
        projectName: projectNameState,
        files: buildCurrentProjectFiles(),
        meta: {
          board: currentBoard,
          mode: codingMode ?? "block",
          language,
          generator,
          environment,
        },
      }),
    [buildCurrentProjectFiles, codingMode, currentBoard, environment, generator, language, projectNameState],
  );

  const setProjectId = useCallback((id: string | null) => {
    setProjectIdState(id);
    setHasLoadedProjectFiles(!id);
    if (!id) {
      setProjectNameState(UNTITLED_PROJECT_NAME);
      useEditorStore.getState().resetEditorState();
    }

    persistActiveProjectId(id);
  }, []);

  const setProjectName = useCallback((name: string) => {
    setProjectNameState(name);
    useEditorStore.getState().setHasUnsavedChanges(true);
  }, []);

  const startNewSketch = useCallback(() => {
    const resolvedLanguage = language === "python" || generator === "micropython" ? "python" : "cpp";
    const sourceFileName = resolvePreferredSourceFileName(language, generator);
    const starterSourceCode = resolveStarterSourceCode(codingMode, language, generator);

    clearPendingProjectIntent();
    persistActiveProjectId(null);
    setProjectIdState(null);
    setProjectNameState(UNTITLED_PROJECT_NAME);
    setHasLoadedProjectFiles(true);

    useEditorStore.getState().resetEditorState();
    useEditorStore.getState().initializeWorkspaceFiles(sourceFileName, resolvedLanguage, starterSourceCode);
    useBlocklyStore.getState().resetBlocklyState();


  }, [clearPendingProjectIntent, codingMode, generator, language]);

  const refreshProjectFiles = useCallback(async () => {
    if (!projectId || !token) return;

    setHasLoadedProjectFiles(false);

    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 401) {
          console.warn(`[ProjectContext] Project ${projectId} not found (${res.status}). Clearing project state.`);
          stashWorkspaceNotice(
            res.status === 401
              ? "Your session ended before this project could load. Sign in again, then reopen your project."
              : "That project is no longer available. Open another project or start a new one."
          );
          setProjectId(null);
          setHasLoadedProjectFiles(true);
        } else {
          console.error("[ProjectContext] Unexpected error fetching project. Status:", res.status);
          setHasLoadedProjectFiles(true);
        }
        return;
      }

      const data = await safeJson<PersistedProjectRecord | null>(res);
      const resolvedMeta = applyProjectMetaToBoardContext(data ?? {});
      const nextProjectState = resolveProjectFilesState({
        record: data,
        currentFiles: filesRef.current,
        currentActiveFileId: activeFileIdRef.current,
        language: resolvedMeta.language,
        generator: resolvedMeta.generator,
      });

      setProjectNameState(nextProjectState.projectName);

      if (nextProjectState.fallbackFile) {
        useEditorStore.getState().setFiles([nextProjectState.fallbackFile]);
        useEditorStore.getState().setActiveFileId(nextProjectState.nextActiveFileId);
        useEditorStore.getState().setHasUnsavedChanges(true);
        setHasLoadedProjectFiles(true);
        return;
      }

      useEditorStore.getState().setFiles(nextProjectState.projectFiles);
      useEditorStore.getState().setActiveFileId(nextProjectState.nextActiveFileId);
      setHasLoadedProjectFiles(true);
    } catch (error) {
      console.error("Failed to fetch project files:", error);
      setHasLoadedProjectFiles(true);
    }
  }, [applyProjectMetaToBoardContext, projectId, setProjectId, token]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshProjectFiles();
    });
  }, [projectId, refreshProjectFiles, token]);

  const saveProject = useCallback(async () => {
    if (!projectId) {
      throw new Error("Open or create a project first.");
    }

    if (!token) {
      throw new Error("Your session ended. Sign in again to save this project.");
    }

    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildCurrentProjectPayload()),
      });

      if (!res.ok) {
        const data = await safeJson<{ error?: string }>(res);
        const defaultMessage =
          res.status === 401
            ? "Your session ended. Sign in again to save this project."
            : res.status === 404
              ? "This project no longer exists. Return to the dashboard and open another project."
              : `Could not save the project right now (status ${res.status}).`;
        throw new Error(data?.error || defaultMessage);
      }

      useEditorStore.getState().setHasUnsavedChanges(false);
      await refreshProjectFiles();
    } catch (error) {
      console.error("Save Project exception:", error);
      throw error instanceof Error ? error : new Error("Could not save the project right now.");
    }
  }, [buildCurrentProjectPayload, projectId, refreshProjectFiles, token]);

  const saveAsProject = useCallback(
    async (name: string) => {
      if (!token) {
        throw new Error("Your session ended. Sign in again to save this project.");
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Enter a project name before saving.");
      }

      const projectPayload = buildProjectPayload({
        projectName: trimmedName,
        files: buildCurrentProjectFiles(),
        meta: {
          board: currentBoard,
          mode: codingMode ?? "block",
          language,
          generator,
          environment,
        },
      });

      const createRes = await apiFetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectPayload),
      });

      if (!createRes.ok) {
        const data = await safeJson<{ error?: string }>(createRes);
        throw new Error(data?.error || "Failed to create project.");
      }

      const newProject = await safeJson<{ id?: string }>(createRes);
      const newId = newProject?.id;
      if (!newId) {
        throw new Error("Invalid response from the API.");
      }

      const putRes = await apiFetch(`/api/projects/${newId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectPayload),
      });

      if (!putRes.ok) {
        const data = await safeJson<{ error?: string }>(putRes);
        throw new Error(data?.error || "Failed to upload files to the new project.");
      }

      setProjectId(newId);
      setProjectNameState(trimmedName);
      useEditorStore.getState().setHasUnsavedChanges(false);
      return newId;
    },
    [buildCurrentProjectFiles, codingMode, currentBoard, environment, generator, language, setProjectId, token],
  );

  const value: ProjectContextValue = {
    projectId,
    setProjectId,
    projectName: projectNameState,
    setProjectName,
    hasLoadedProjectFiles,
    refreshProjectFiles,
    saveProject,
    saveAsProject,
    startNewSketch,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
