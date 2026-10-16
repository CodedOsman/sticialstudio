import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { WorkspaceSvg } from 'blockly';
import { BOARD_CONFIG } from '@/lib/boards/boardConfig';
import { useBoard, type CodingMode } from '@/contexts/BoardContext';
import { useProject, type FileItem } from '@/contexts/ProjectContext';
import { useEditorStore } from '@/stores/editorStore';
import { useBlocklyStore } from '@/stores/blocklyStore';
import { DEFAULT_ARDUINO_CODE, DEFAULT_MICROPYTHON_CODE } from '@/templates/codeTemplates';
import { buildSourceCodeFromBlocklyWorkspace } from '@/lib/blockly/codegen';
import { getLocalProject, saveLocalProject } from '@/lib/projects/localProjectService';
import { useSplitViewEventBus } from './SplitViewEventBus';
import { DEFAULT_BLOCKLY_XML } from './constants';
import {
  buildProjectFilePath,
  getPreferredSourceFileName,
  isLikelyBlocklyXml,
  syncBlocklyWorkspaceSource,
} from './helpers';

const EditorOrchestratorContext = createContext<EditorOrchestratorValue | null>(null);

export interface MicroPythonProjectFile {
  path: string;
  content: string;
}

export interface ProjectCompileFile {
  path: string;
  content: string;
}

export interface EditorOrchestratorValue {
  boardConfig: (typeof BOARD_CONFIG)[keyof typeof BOARD_CONFIG];
  currentBoard: keyof typeof BOARD_CONFIG;
  currentLanguage: string | null;
  currentGenerator: string | null;
  codingMode: CodingMode;
  compileStrategy: string;
  environment: 'virtual' | 'physical';
  isBlockMode: boolean;
  preferredSourceFileName: string;
  entrySourceFile: FileItem | null;
  activeEditorCode: string;
  activeEditorLanguage: string;
  activeEditorFileName: string;
  sourceCode: string;
  blocklyXml: string;
  selectedBlocklyCategory: string;
  setSelectedBlocklyCategory: (category: string) => void;
  setCurrentBoard: (board: keyof typeof BOARD_CONFIG) => void;
  handleEntrySourceCodeChange: (newCode: string) => void;
  handleActiveTextCodeChange: (newCode: string) => void;
  handleBlocklyXmlChange: (xml: string) => void;
  handleBlocklyWorkspaceReady: (workspace: WorkspaceSvg | null) => void;
  syncBlocklySourceCode: () => string;
  textEditorWorkspaceLabel: string;
  textEditorSaveHint: string;
  hasRunnableSimulationCode: boolean;
  isBlocklyWorkspaceEmpty: boolean;
  micropythonProjectFiles: MicroPythonProjectFile[];
  micropythonProjectDirectories: string[];
  arduinoProjectFiles: ProjectCompileFile[];
  arduinoEntryFilePath: string | null;
}

export function useBlocklySync(): EditorOrchestratorValue {
  const eventBus = useSplitViewEventBus();
  const {
    currentBoard,
    codingMode,
    language: currentLanguage,
    generator: currentGenerator,
    compileStrategy,
    environment: rawEnvironment,
    setCodingMode,
    setLanguage,
    setGenerator,
    setCurrentBoard,
    setEnvironment,
  } = useBoard();
  const { projectId, projectName, setProjectId } = useProject();
  const files = useEditorStore((state) => state.files);
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const updateFileContent = useEditorStore((state) => state.updateFileContent);
  const createFile = useEditorStore((state) => state.createFile);
  const setActiveFileId = useEditorStore((state) => state.setActiveFileId);
  const bootstrapOfflineFiles = useEditorStore((state) => state.bootstrapOfflineFiles);
  const setHasUnsavedChanges = useEditorStore((state) => state.setHasUnsavedChanges);
  const selectedBlocklyCategory = useBlocklyStore((state) => state.selectedCategoryName);
  const setSelectedBlocklyCategory = useBlocklyStore((state) => state.setSelectedCategoryName);
  const resetBlocklyState = useBlocklyStore((state) => state.resetBlocklyState);

  const environment = rawEnvironment ?? 'virtual';
  const boardConfig = BOARD_CONFIG[currentBoard];
  const isBlockMode = codingMode === 'block';
  const blocklyWorkspaceRef = useRef<WorkspaceSvg | null>(null);
  const seededFiles = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  const entrySourceFileRef = useRef<FileItem | null>(null);
  const blocklyFileRef = useRef<FileItem | null>(null);
  const sourceCodeRef = useRef('');
  const blocklyXmlRef = useRef(DEFAULT_BLOCKLY_XML);
  const lastSavedSnapshotRef = useRef({ sourceCode: '', blocklyXml: DEFAULT_BLOCKLY_XML });

  const preferredSourceFileName = useMemo(
    () => getPreferredSourceFileName(currentLanguage, currentGenerator),
    [currentGenerator, currentLanguage],
  );

  const syncBoardRuntimeSelection = useCallback(() => {
    if (!boardConfig) return;

    if (currentLanguage !== boardConfig.language) {
      setLanguage(boardConfig.language);
    }

    if (currentGenerator !== boardConfig.generator) {
      setGenerator(boardConfig.generator);
    }
  }, [boardConfig, currentGenerator, currentLanguage, setGenerator, setLanguage]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('setup_arduino_cli')
          .then(() => console.log('[Tauri] Arduino CLI setup complete'))
          .catch(err => console.error('[Tauri] Failed to setup Arduino CLI:', err));
      }).catch(() => {});
    }
  }, []);

  const blocklyFile = useMemo(
    () =>
      files.find((file) => file.name === 'main.blockly') ||
      files.find((file) => file.type === 'blockly') ||
      null,
    [files],
  );

  const entrySourceFile = useMemo(() => {
    const byPreferredName = files.find((file) => file.name === preferredSourceFileName);
    if (byPreferredName) return byPreferredName;

    const byExpectedType = files.find((file) =>
      preferredSourceFileName === 'main.py' ? file.type === 'python' : file.type === 'cpp',
    );
    if (byExpectedType) return byExpectedType;

    return (
      files.find((file) => file.type !== 'folder' && file.id !== blocklyFile?.id) ||
      files.find((file) => file.type !== 'folder') ||
      null
    );
  }, [blocklyFile?.id, files, preferredSourceFileName]);

  const activeTextFile = useMemo(() => {
    const byActiveId = files.find(
      (file) => file.id === activeFileId && file.type !== 'folder' && file.id !== blocklyFile?.id,
    );
    if (byActiveId) return byActiveId;
    return entrySourceFile;
  }, [activeFileId, blocklyFile?.id, entrySourceFile, files]);

  const activeEditorFile = isBlockMode ? entrySourceFile : activeTextFile;
  const activeEditorCode = activeEditorFile ? activeEditorFile.content : '';
  const activeEditorLanguage = activeEditorFile
    ? activeEditorFile.type === 'python' || activeEditorFile.name.endsWith('.py')
      ? 'python'
      : 'cpp'
    : currentLanguage || 'cpp';
  const activeEditorFileName = activeEditorFile?.name || preferredSourceFileName;
  const sourceCode = entrySourceFile ? entrySourceFile.content : '';
  const rawBlocklyContent = blocklyFile?.content || '';
  const blocklyXmlIsValid = isLikelyBlocklyXml(rawBlocklyContent);
  const blocklyXml =
    blocklyXmlIsValid && rawBlocklyContent.trim().length > 0 ? rawBlocklyContent : DEFAULT_BLOCKLY_XML;
  const hasRunnableSimulationCode = isBlockMode
    ? blocklyXml.trim().length > 0 || sourceCode.trim().length > 0
    : sourceCode.trim().length > 0;
  const isBlocklyWorkspaceEmpty = blocklyXml.trim() === DEFAULT_BLOCKLY_XML && sourceCode.trim().length === 0;
  const textEditorWorkspaceLabel = projectId
    ? `Project: ${projectName.trim() || 'Untitled Project'}`
    : 'Scratch workspace';
  const textEditorSaveHint = projectId ? 'Ctrl/Cmd+S Save changes' : 'Ctrl/Cmd+S Create project';

  const projectFilesById = useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);
  const micropythonProjectFiles = useMemo(
    () =>
      files
        .filter(
          (file) =>
            file.type !== 'folder' &&
            file.id !== blocklyFile?.id &&
            (file.type === 'python' || file.name.toLowerCase().endsWith('.py')),
        )
        .map((file) => ({
          path: buildProjectFilePath(file, projectFilesById),
          content: file.content,
        })),
    [blocklyFile?.id, files, projectFilesById],
  );
  const micropythonProjectDirectories = useMemo(() => {
    const directories = new Set<string>();

    micropythonProjectFiles.forEach((file) => {
      const segments = file.path.split('/');
      segments.pop();

      let currentPath = '';
      segments.forEach((segment) => {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        directories.add(currentPath);
      });
    });

    return Array.from(directories).sort((left, right) => left.split('/').length - right.split('/').length);
  }, [micropythonProjectFiles]);
  const arduinoProjectFiles = useMemo(
    () =>
      files
        .filter((file) => {
          if (file.type === 'folder' || file.id === blocklyFile?.id || file.id === entrySourceFile?.id) {
            return false;
          }

          if (file.type === 'cpp') {
            return true;
          }

          const lowerName = file.name.toLowerCase();
          return (
            lowerName.endsWith('.ino') ||
            lowerName.endsWith('.cpp') ||
            lowerName.endsWith('.cc') ||
            lowerName.endsWith('.cxx') ||
            lowerName.endsWith('.c') ||
            lowerName.endsWith('.h') ||
            lowerName.endsWith('.hpp')
          );
        })
        .map((file) => ({
          path: buildProjectFilePath(file, projectFilesById),
          content: file.content,
        })),
    [blocklyFile?.id, files, projectFilesById],
  );
  const arduinoEntryFilePath = entrySourceFile ? buildProjectFilePath(entrySourceFile, projectFilesById) : null;

  useEffect(() => {
    entrySourceFileRef.current = entrySourceFile;
    blocklyFileRef.current = blocklyFile;
    sourceCodeRef.current = sourceCode;
    blocklyXmlRef.current = blocklyXml;
  }, [blocklyFile, blocklyXml, entrySourceFile, sourceCode]);

  useEffect(() => {
    const nextActiveFileId = isBlockMode ? entrySourceFile?.id : activeTextFile?.id;
    if (nextActiveFileId && nextActiveFileId !== activeFileId) {
      setActiveFileId(nextActiveFileId);
    }
  }, [activeFileId, activeTextFile?.id, entrySourceFile?.id, isBlockMode, setActiveFileId]);

  useEffect(() => {
    if (isBlockMode) {
      return;
    }

    if (entrySourceFile && entrySourceFile.content.trim() === '' && !seededFiles.current.has(entrySourceFile.id)) {
      seededFiles.current.add(entrySourceFile.id);
      
      const isPython = currentLanguage === 'python' || entrySourceFile.name.endsWith('.py');
      updateFileContent(entrySourceFile.id, isPython ? DEFAULT_MICROPYTHON_CODE : DEFAULT_ARDUINO_CODE);
    }
  }, [currentLanguage, entrySourceFile, isBlockMode, updateFileContent]);

  const prevLanguageRef = useRef<string | null>(currentLanguage);

  useEffect(() => {
    if (files.length === 0 || !bootstrappedRef.current) {
      prevLanguageRef.current = currentLanguage;
      return;
    }

    const langChanged = prevLanguageRef.current !== currentLanguage;
    prevLanguageRef.current = currentLanguage;

    // If the language changed, or we are switching to text mode and the preferred file is missing,
    // we need to ensure the correct file exists and is active.
    if (langChanged || !isBlockMode) {
      const preferredFile = files.find((f) => f.name === preferredSourceFileName);
      if (!preferredFile) {
        const defaultCode = currentLanguage === 'python' ? DEFAULT_MICROPYTHON_CODE : DEFAULT_ARDUINO_CODE;
        createFile(preferredSourceFileName, currentLanguage || 'cpp', null, defaultCode);
      } else if (langChanged && !isBlockMode) {
        // Only force active file change if language actually changed while in text mode,
        // or if we want to switch context. Actually, if we are in text mode, 
        // we should ensure the preferred file is active.
        setActiveFileId(preferredFile.id);
      } else if (langChanged) {
        // if language changed in block mode, we don't necessarily need to force active text file,
        // but it doesn't hurt.
        setActiveFileId(preferredFile.id);
      }
    }
  }, [currentLanguage, preferredSourceFileName, files, isBlockMode, createFile, setActiveFileId]);

  useEffect(() => {
    if (bootstrappedRef.current || files.length > 0) return;
    bootstrappedRef.current = true;

    const defaultCode = isBlockMode
      ? ''
      : currentLanguage === 'python' || currentGenerator === 'micropython'
        ? DEFAULT_MICROPYTHON_CODE
        : DEFAULT_ARDUINO_CODE;

    bootstrapOfflineFiles(preferredSourceFileName, currentLanguage || 'cpp', defaultCode);
  }, [bootstrapOfflineFiles, currentGenerator, currentLanguage, files.length, isBlockMode, preferredSourceFileName]);

  useEffect(() => {
    if (!blocklyFile?.id || blocklyXmlIsValid) return;

    const legacyContent = blocklyFile.content || '';

    if (entrySourceFile?.id && entrySourceFile.id !== blocklyFile.id && entrySourceFile.content !== legacyContent) {
      updateFileContent(entrySourceFile.id, legacyContent);
    }

    updateFileContent(blocklyFile.id, DEFAULT_BLOCKLY_XML);
  }, [
    blocklyFile?.content,
    blocklyFile?.id,
    blocklyXmlIsValid,
    entrySourceFile?.content,
    entrySourceFile?.id,
    updateFileContent,
  ]);

  const handleEntrySourceCodeChange = useCallback(
    (newCode: string) => {
      if (entrySourceFile?.id) {
        if (entrySourceFile.content === newCode) {
          return;
        }
        updateFileContent(entrySourceFile.id, newCode);
        eventBus.emit('USER_EDITED', { source: 'text', timestamp: Date.now() });
      }
    },
    [entrySourceFile?.content, entrySourceFile?.id, eventBus, updateFileContent],
  );

  const handleActiveTextCodeChange = useCallback(
    (newCode: string) => {
      if (activeTextFile?.id) {
        if (activeTextFile.content === newCode) {
          return;
        }
        updateFileContent(activeTextFile.id, newCode);
        eventBus.emit('USER_EDITED', { source: 'text', timestamp: Date.now() });
      }
    },
    [activeTextFile?.content, activeTextFile?.id, eventBus, updateFileContent],
  );

  const handleBlocklyXmlChange = useCallback(
    (xml: string) => {
      const nextXml = xml.trim().length > 0 ? xml : DEFAULT_BLOCKLY_XML;
      if (nextXml !== blocklyXmlRef.current) {
        eventBus.emit('USER_EDITED', { source: 'blockly', timestamp: Date.now() });
      }
      eventBus.emit('BLOCKLY_CHANGED', { xml: nextXml });
    },
    [eventBus],
  );

  const handleBlocklyWorkspaceReady = useCallback((workspace: WorkspaceSvg | null) => {
    blocklyWorkspaceRef.current = workspace;
  }, []);

  const syncBlocklySourceCode = useCallback(() => {
    if (!isBlockMode || !blocklyWorkspaceRef.current) {
      return sourceCodeRef.current;
    }

    return syncBlocklyWorkspaceSource(
      blocklyWorkspaceRef.current,
      currentGenerator || 'arduino',
      sourceCodeRef.current,
      (nextCode) => eventBus.emit('CODE_GENERATED', { code: nextCode, warning: null }),
      (workspace, generatorType) => buildSourceCodeFromBlocklyWorkspace(workspace, generatorType),
    );
  }, [currentGenerator, eventBus, isBlockMode]);

  const handleChangeCodingMode = useCallback(
    (nextMode: Exclude<CodingMode, null>) => {
      if (codingMode === nextMode) {
        syncBoardRuntimeSelection();
        return;
      }

      if (codingMode === 'block' && nextMode === 'text') {
        syncBlocklySourceCode();
      }

      syncBoardRuntimeSelection();
      setCodingMode(nextMode);

      if (projectId) {
        const local = getLocalProject(projectId);
        if (local) {
          saveLocalProject({
            ...local,
            meta: {
              board: local.board,
              mode: nextMode,
              language: local.language,
              generator: local.generator,
              environment: local.environment,
            },
          });
        }
      }
    },
    [codingMode, projectId, setCodingMode, syncBlocklySourceCode, syncBoardRuntimeSelection],
  );

  useEffect(() => {
    return eventBus.subscribe('BLOCKLY_CHANGED', ({ xml }) => {
      const nextXml = xml.trim().length > 0 ? xml : DEFAULT_BLOCKLY_XML;
      const currentBlocklyFile = blocklyFileRef.current;

      if (currentBlocklyFile?.content === nextXml) {
        return;
      }

      if (currentBlocklyFile?.id) {
        updateFileContent(currentBlocklyFile.id, nextXml);
        return;
      }

      createFile('main.blockly', 'blockly', null, nextXml);
    });
  }, [createFile, eventBus, updateFileContent]);

  useEffect(() => {
    return eventBus.subscribe('CODE_GENERATED', ({ code }) => {
      const nextCode = code ?? '';
      const currentEntrySourceFile = entrySourceFileRef.current;

      if (currentEntrySourceFile?.content === nextCode) {
        return;
      }

      if (currentEntrySourceFile?.id) {
        updateFileContent(currentEntrySourceFile.id, nextCode);
        return;
      }

      const nextType = currentLanguage === 'python' || currentGenerator === 'micropython' ? 'python' : 'cpp';
      createFile(preferredSourceFileName, nextType, null, nextCode);
    });
  }, [createFile, currentGenerator, currentLanguage, eventBus, preferredSourceFileName, updateFileContent]);

  useEffect(() => {
    return eventBus.subscribe('FILE_SAVED', () => {
      lastSavedSnapshotRef.current = {
        sourceCode: sourceCodeRef.current,
        blocklyXml: blocklyXmlRef.current,
      };
    });
  }, [eventBus]);

  useEffect(() => {
    return eventBus.on('editor:coding-mode-request', ({ mode }) => {
      handleChangeCodingMode(mode);
    });
  }, [eventBus, handleChangeCodingMode]);

  useEffect(() => {
    return eventBus.on('editor:runtime-sync-request', () => {
      syncBoardRuntimeSelection();
    });
  }, [eventBus, syncBoardRuntimeSelection]);

  useEffect(() => {
    const defaultBoard = ('Arduino Uno' in BOARD_CONFIG ? 'Arduino Uno' : Object.keys(BOARD_CONFIG)[0]) as keyof typeof BOARD_CONFIG;

    return eventBus.on('app:reset-request', () => {
      const fallbackConfig = BOARD_CONFIG[defaultBoard];
      setCurrentBoard(defaultBoard);
      setCodingMode('block');
      setLanguage(fallbackConfig.language ?? null);
      setGenerator(fallbackConfig.generator ?? null);
      setEnvironment('virtual');
      setProjectId(null);
      setHasUnsavedChanges(false);
      resetBlocklyState();
      blocklyWorkspaceRef.current = null;
      bootstrappedRef.current = false;
      seededFiles.current.clear();
      lastSavedSnapshotRef.current = { sourceCode: '', blocklyXml: DEFAULT_BLOCKLY_XML };

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('activeProjectId');
        window.localStorage.removeItem('edtech-board-context');
        window.sessionStorage.removeItem('workspaceNotice');
      }
    });
  }, [eventBus, resetBlocklyState, setCodingMode, setCurrentBoard, setEnvironment, setGenerator, setHasUnsavedChanges, setLanguage, setProjectId]);

  return {
    boardConfig,
    currentBoard,
    currentLanguage,
    currentGenerator,
    codingMode,
    compileStrategy,
    environment,
    setCurrentBoard,
    isBlockMode,
    preferredSourceFileName,
    entrySourceFile,
    activeEditorCode,
    activeEditorLanguage,
    activeEditorFileName,
    sourceCode,
    blocklyXml,
    selectedBlocklyCategory,
    setSelectedBlocklyCategory,
    handleEntrySourceCodeChange,
    handleActiveTextCodeChange,
    handleBlocklyXmlChange,
    handleBlocklyWorkspaceReady,
    syncBlocklySourceCode,
    textEditorWorkspaceLabel,
    textEditorSaveHint,
    hasRunnableSimulationCode,
    isBlocklyWorkspaceEmpty,
    micropythonProjectFiles,
    micropythonProjectDirectories,
    arduinoProjectFiles,
    arduinoEntryFilePath,
  };
}

export function EditorOrchestrator({ children }: { children: ReactNode }) {
  const value = useBlocklySync();
  return <EditorOrchestratorContext.Provider value={value}>{children}</EditorOrchestratorContext.Provider>;
}

export function useEditorOrchestrator() {
  const context = useContext(EditorOrchestratorContext);
  if (!context) {
    throw new Error('useEditorOrchestrator must be used within EditorOrchestrator');
  }
  return context;
}





