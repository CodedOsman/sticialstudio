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
import { getLocalProject, saveLocalProject } from "@/lib/projects/localProjectService";
import { saveProjectFilesToDisk } from "@/lib/projects/diskProjectService";
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
  saveAsProject: (name: string, location?: string) => Promise<string>;
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
  const lastLoadedProjectIdRef = useRef<string | null>(null);
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
    if (!projectId) return;

    setHasLoadedProjectFiles(false);

    // 1. Check local storage first
    const local = getLocalProject(projectId);
    if (local) {
      const resolvedMeta = applyProjectMetaToBoardContext(local);
      const nextProjectState = resolveProjectFilesState({
        record: local,
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
      return;
    }

    // 2. Fall back to remote API if not found in local storage and remote token exists
    if (token && token !== "local") {
      try {
        const res = await apiFetch(`/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await safeJson<PersistedProjectRecord | null>(res);
          if (data) {
            const resolvedMeta = applyProjectMetaToBoardContext(data);
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
            } else {
              useEditorStore.getState().setFiles(nextProjectState.projectFiles);
              useEditorStore.getState().setActiveFileId(nextProjectState.nextActiveFileId);
            }
            setHasLoadedProjectFiles(true);
            return;
          }
        }
      } catch (error) {
        console.warn("[ProjectContext] Remote project fetch failed:", error);
      }
    }

    setHasLoadedProjectFiles(true);
  }, [applyProjectMetaToBoardContext, projectId, token]);

  const refreshProjectFilesRef = useRef(refreshProjectFiles);
  useEffect(() => {
    refreshProjectFilesRef.current = refreshProjectFiles;
  }, [refreshProjectFiles]);

  useEffect(() => {
    if (projectId && projectId !== lastLoadedProjectIdRef.current) {
      lastLoadedProjectIdRef.current = projectId;
      queueMicrotask(() => {
        void refreshProjectFilesRef.current();
      });
    } else if (!projectId) {
      lastLoadedProjectIdRef.current = null;
    }
  }, [projectId]);

  const saveProject = useCallback(async () => {
    const currentFiles = buildCurrentProjectFiles();
    const currentMeta = {
      board: currentBoard,
      mode: codingMode ?? "block",
      language,
      generator,
      environment,
    };

    const targetId = projectId || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const existingLocal = targetId ? getLocalProject(targetId) : null;
    const targetLocation = existingLocal?.location;

    if (targetLocation) {
      try {
        await saveProjectFilesToDisk(targetLocation, projectNameState, currentFiles);
      } catch (diskErr) {
        console.warn("Could not write project files to disk:", diskErr);
      }
    }

    // Always persist to local project storage first so work is never lost
    saveLocalProject({
      id: targetId,
      name: projectNameState,
      location: targetLocation,
      files: currentFiles,
      meta: currentMeta,
    });

    if (!projectId) {
      lastLoadedProjectIdRef.current = targetId;
      setProjectId(targetId);
    }

    // Optional upstream sync if remote API is available
    if (token && token !== "local") {
      try {
        await apiFetch(`/api/projects/${targetId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildCurrentProjectPayload()),
        });
      } catch (error) {
        console.warn("Could not sync project upstream, saved locally:", error);
      }
    }

    useEditorStore.getState().setHasUnsavedChanges(false);
  }, [buildCurrentProjectFiles, buildCurrentProjectPayload, codingMode, currentBoard, environment, generator, language, projectId, projectNameState, setProjectId, token]);

  const saveAsProject = useCallback(
    async (name: string, location?: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Enter a project name before saving.");
      }

      const currentFiles = buildCurrentProjectFiles();
      const currentMeta = {
        board: currentBoard,
        mode: codingMode ?? "block",
        language,
        generator,
        environment,
      };

      if (location) {
        try {
          await saveProjectFilesToDisk(location, trimmedName, currentFiles);
        } catch (diskErr) {
          console.warn("Could not write project files to disk:", diskErr);
        }
      }

      const projectPayload = buildProjectPayload({
        projectName: trimmedName,
        files: currentFiles,
        meta: currentMeta,
      });

      let newId: string | null = null;

      // Try upstream API only if token is valid and not 'local'
      if (token && token !== "local") {
        try {
          const createRes = await apiFetch("/api/projects", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(projectPayload),
          });

          if (createRes.ok) {
            const data = await safeJson<{ id?: string }>(createRes);
            if (data?.id) {
              newId = data.id;
              await apiFetch(`/api/projects/${newId}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(projectPayload),
              }).catch(() => {});
            }
          }
        } catch (apiError) {
          console.warn("API project creation unavailable, using local project storage:", apiError);
        }
      }

      // Always save locally to ensure offline / desktop reliability
      const savedProject = saveLocalProject({
        id: newId,
        name: trimmedName,
        location: location || null,
        files: currentFiles,
        meta: currentMeta,
      });
      newId = savedProject.id;

      lastLoadedProjectIdRef.current = newId;
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
