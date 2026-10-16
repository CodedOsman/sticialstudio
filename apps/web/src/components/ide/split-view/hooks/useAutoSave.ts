import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useBoard } from '@/contexts/BoardContext';
import { useProject } from '@/contexts/ProjectContext';
import { useEditorStore, type FileItem } from '@/stores/editorStore';

import { useStudioPreferences } from '@/contexts/StudioPreferencesContext';
import { buildProjectMetaPayload } from '@/lib/projects/projectMeta';

import { useSplitViewEventBus } from '../SplitViewEventBus';
import { useCompileController } from '../CompileController';
import type { useWebSerial } from '@/hooks/useWebSerial';
import { getDefaultProjectsDirectory, pickProjectFolder } from '@/lib/projects/diskProjectService';

export interface AutoSaveManagerValue {
  isSaving: boolean;
  isSaveModalOpen: boolean;
  newProjectName: string;
  setNewProjectName: Dispatch<SetStateAction<string>>;
  saveLocation: string;
  setSaveLocation: Dispatch<SetStateAction<string>>;
  browseSaveLocation: () => Promise<void>;
  closeSaveModal: () => void;
  submitSaveModal: () => Promise<void>;
  visibleSaveStatusText: string | null;
  visibleSaveStatusTone: 'neutral' | 'success' | 'error';
}

type WebSerialController = ReturnType<typeof useWebSerial>;

type ProjectSnapshotContext = {
  projectName: string;
  currentBoard: string;
  codingMode: 'block' | 'text' | null;
  language: string | null;
  generator: string | null;
  environment: 'virtual' | 'physical' | null;
};

const AUTO_SAVE_DEBOUNCE_MS = 300;

function normalizeFileEntry(file: FileItem) {
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    parentId: file.parentId,
    content: file.content,
  };
}

function sortFilesForSnapshot(files: FileItem[]) {
  return [...files].sort((left, right) => {
    const leftPath = `${left.parentId ?? ''}/${left.name}/${left.id}`;
    const rightPath = `${right.parentId ?? ''}/${right.name}/${right.id}`;
    return leftPath.localeCompare(rightPath);
  });
}

function normalizeProjectName(projectName: string) {
  const trimmed = projectName.trim();
  return trimmed.length > 0 ? trimmed : 'Untitled Project';
}

function buildSavableFileSet(files: FileItem[], context: ProjectSnapshotContext) {
  return sortFilesForSnapshot(files);
}

function buildProjectSnapshot(context: ProjectSnapshotContext) {
  const files = buildSavableFileSet(useEditorStore.getState().files, context).map(normalizeFileEntry);
  return JSON.stringify({
    name: normalizeProjectName(context.projectName),
    projectMeta: buildProjectMetaPayload({
      board: context.currentBoard,
      mode: context.codingMode ?? 'block',
      language: context.language,
      generator: context.generator,
      environment: context.environment,
    }),
    files,
  });
}



export function useAutoSave(webSerial: WebSerialController): AutoSaveManagerValue {
  const eventBus = useSplitViewEventBus();
  const { autoSave } = useStudioPreferences();
  const { currentBoard, codingMode, language, generator, environment } = useBoard();
  const { projectId, projectName, saveProject, saveAsProject } = useProject();
  const { isCompiling } = useCompileController();
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [saveLocation, setSaveLocation] = useState('');
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);
  const [saveStatusTone, setSaveStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral');

  const browseSaveLocation = useCallback(async () => {
    try {
      const selected = await pickProjectFolder(saveLocation);
      if (selected) {
        setSaveLocation(selected);
      }
    } catch (err) {
      console.warn('Failed to pick project folder:', err);
    }
  }, [saveLocation]);

  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSaveRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const lastQueuedSnapshotRef = useRef<string | null>(null);
  const lifecycleRef = useRef({ isSaving: false, isCompiling: false, autoSave: false, projectId: null as string | null });
  const contextRef = useRef<ProjectSnapshotContext>({
    projectName,
    currentBoard,
    codingMode,
    language,
    generator,
    environment,
  });

  const suggestedProjectName = useMemo(
    () =>
      projectName.trim() && projectName.trim() !== 'Untitled Project'
        ? projectName.trim()
        : `${currentBoard} ${codingMode === 'block' ? 'Block' : 'Code'} Project`,
    [codingMode, currentBoard, projectName],
  );

  useEffect(() => {
    lifecycleRef.current = {
      isSaving,
      isCompiling,
      autoSave,
      projectId,
    };
  }, [autoSave, isCompiling, isSaving, projectId]);

  useEffect(() => {
    contextRef.current = {
      projectName,
      currentBoard,
      codingMode,
      language,
      generator,
      environment,
    };
  }, [codingMode, currentBoard, environment, generator, language, projectName]);

  const clearSaveStatusTimeout = useCallback(() => {
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = null;
    }
  }, []);

  const scheduleSaveStatusClear = useCallback(
    (durationMs: number) => {
      clearSaveStatusTimeout();
      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatusText(null);
      }, durationMs);
    },
    [clearSaveStatusTimeout],
  );

  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, []);

  const performProjectSave = useCallback(
    async (origin: 'manual' | 'auto' = 'manual', snapshotOverride?: string | null) => {
      if (!projectId) {
        if (origin === 'manual') {
          setNewProjectName(suggestedProjectName);
          if (!saveLocation) {
            getDefaultProjectsDirectory()
              .then((dir) => {
                if (dir) setSaveLocation(dir);
              })
              .catch(() => {});
          }
          setIsSaveModalOpen(true);
        }
        return false;
      }


      const snapshot = snapshotOverride ?? buildProjectSnapshot(contextRef.current);

      if (origin === 'auto' && snapshot === lastSavedSnapshotRef.current) {
        pendingAutoSaveRef.current = false;
        lastQueuedSnapshotRef.current = snapshot;
        useEditorStore.getState().setHasUnsavedChanges(false);
        return true;
      }

      clearSaveStatusTimeout();
      setIsSaving(true);
      lifecycleRef.current.isSaving = true;
      try {
        await saveProject();
        const statusText = origin === 'auto' ? 'Auto-saved' : 'Project saved';
        if (origin === 'manual') {
          webSerial.addMessage('system', 'Project saved.');
        }
        lastSavedSnapshotRef.current = snapshot;
        lastQueuedSnapshotRef.current = snapshot;
        pendingAutoSaveRef.current = false;
        eventBus.emit('FILE_SAVED', {
          origin,
          projectId,
          projectName: normalizeProjectName(projectName),
        });
        setSaveStatusText(statusText);
        setSaveStatusTone('success');
        scheduleSaveStatusClear(origin === 'auto' ? 2200 : 3200);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save the project right now.';
        webSerial.addMessage('error', `${origin === 'auto' ? 'Auto-save failed' : 'Failed to save project'}: ${message}`);
        setSaveStatusText(message);
        setSaveStatusTone('error');
        scheduleSaveStatusClear(4200);
        return false;
      } finally {
        lifecycleRef.current.isSaving = false;
        setIsSaving(false);
      }
    },
    [clearSaveStatusTimeout, eventBus, projectId, projectName, saveProject, scheduleSaveStatusClear, suggestedProjectName, webSerial],
  );

  const flushAutoSave = useCallback(async () => {
    cancelAutoSave();

    if (!lifecycleRef.current.autoSave || !lifecycleRef.current.projectId) {
      pendingAutoSaveRef.current = false;
      return;
    }

    if (lifecycleRef.current.isSaving || lifecycleRef.current.isCompiling) {
      pendingAutoSaveRef.current = true;
      return;
    }


    const snapshot = buildProjectSnapshot(contextRef.current);

    if (snapshot === lastSavedSnapshotRef.current) {
      pendingAutoSaveRef.current = false;
      lastQueuedSnapshotRef.current = snapshot;
      useEditorStore.getState().setHasUnsavedChanges(false);
      return;
    }

    if (snapshot === lastQueuedSnapshotRef.current && lifecycleRef.current.isSaving) {
      pendingAutoSaveRef.current = true;
      return;
    }

    lastQueuedSnapshotRef.current = snapshot;
    pendingAutoSaveRef.current = false;
    await performProjectSave('auto', snapshot);
  }, [cancelAutoSave, performProjectSave]);

  const scheduleAutoSave = useCallback(() => {
    if (!lifecycleRef.current.autoSave || !lifecycleRef.current.projectId) {
      return;
    }

    pendingAutoSaveRef.current = true;
    cancelAutoSave();

    if (lifecycleRef.current.isSaving || lifecycleRef.current.isCompiling) {
      return;
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      void flushAutoSave();
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [cancelAutoSave, flushAutoSave]);

  const submitSaveModal = useCallback(async () => {
    clearSaveStatusTimeout();


    const trimmedProjectName = newProjectName.trim();
    try {
      setIsSaving(true);
      lifecycleRef.current.isSaving = true;
      const newId = await saveAsProject(trimmedProjectName, saveLocation);
      const snapshot = buildProjectSnapshot({
        ...contextRef.current,
        projectName: trimmedProjectName,
      });
      lastSavedSnapshotRef.current = snapshot;
      lastQueuedSnapshotRef.current = snapshot;
      pendingAutoSaveRef.current = false;
      setNewProjectName(trimmedProjectName);
      setIsSaveModalOpen(false);
      eventBus.emit('FILE_SAVED', {
        origin: 'create',
        projectId: newId,
        projectName: trimmedProjectName,
      });
      webSerial.addMessage('system', `Project created and saved as ${trimmedProjectName}.`);
      setSaveStatusText(`Saved as ${trimmedProjectName}`);
      setSaveStatusTone('success');
      scheduleSaveStatusClear(3200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project.';
      webSerial.addMessage('error', message);
      setSaveStatusText(message);
      setSaveStatusTone('error');
      scheduleSaveStatusClear(4200);
    } finally {
      lifecycleRef.current.isSaving = false;
      setIsSaving(false);
    }
  }, [clearSaveStatusTimeout, eventBus, newProjectName, saveAsProject, saveLocation, scheduleSaveStatusClear, webSerial]);

  useEffect(() => {
    return eventBus.on('project:save-request', ({ origin }) => {
      void performProjectSave(origin);
    });
  }, [eventBus, performProjectSave]);

  useEffect(() => {
    return eventBus.on('USER_EDITED', () => {
      scheduleAutoSave();
    });
  }, [eventBus, scheduleAutoSave]);

  useEffect(() => {
    return eventBus.on('FILE_SAVED', () => {
      cancelAutoSave();
      const snapshot = buildProjectSnapshot(contextRef.current);
      lastSavedSnapshotRef.current = snapshot;
      lastQueuedSnapshotRef.current = snapshot;
      pendingAutoSaveRef.current = false;
    });
  }, [cancelAutoSave, eventBus]);

  useEffect(() => {
    if (!projectId) {
      cancelAutoSave();
      lastSavedSnapshotRef.current = null;
      lastQueuedSnapshotRef.current = null;
      pendingAutoSaveRef.current = false;
      return;
    }

    if (!hasUnsavedChanges && !isSaving) {
      const snapshot = buildProjectSnapshot(contextRef.current);
      lastSavedSnapshotRef.current = snapshot;
      lastQueuedSnapshotRef.current = snapshot;
    }
  }, [cancelAutoSave, hasUnsavedChanges, isSaving, projectId]);

  useEffect(() => {
    if (!isSaving && !isCompiling && pendingAutoSaveRef.current) {
      scheduleAutoSave();
    }
  }, [isCompiling, isSaving, scheduleAutoSave]);

  useEffect(() => {
    return eventBus.on('app:reset-request', () => {
      clearSaveStatusTimeout();
      cancelAutoSave();
      pendingAutoSaveRef.current = false;
      lastSavedSnapshotRef.current = null;
      lastQueuedSnapshotRef.current = null;
      lifecycleRef.current.isSaving = false;
      setIsSaving(false);
      setIsSaveModalOpen(false);
      setNewProjectName('');
      setSaveStatusText('App reset');
      setSaveStatusTone('success');
      scheduleSaveStatusClear(3200);
    });
  }, [cancelAutoSave, clearSaveStatusTimeout, eventBus, scheduleSaveStatusClear]);

  useEffect(() => {
    return () => {
      clearSaveStatusTimeout();
      cancelAutoSave();
    };
  }, [cancelAutoSave, clearSaveStatusTimeout]);

  return {
    isSaving,
    isSaveModalOpen,
    newProjectName,
    setNewProjectName,
    saveLocation,
    setSaveLocation,
    browseSaveLocation,
    closeSaveModal: () => setIsSaveModalOpen(false),
    submitSaveModal,
    visibleSaveStatusText: saveStatusText ?? (!projectId ? 'Scratch workspace' : hasUnsavedChanges ? 'Unsaved changes' : null),
    visibleSaveStatusTone: saveStatusText ? saveStatusTone : 'neutral',
  };
}


