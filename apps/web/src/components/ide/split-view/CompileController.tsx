import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { API_BASE_URL, apiFetch, safeJson } from '@/lib/api';
import { useEditorOrchestrator } from './EditorOrchestrator';
import { useSplitViewEventBus } from './SplitViewEventBus';
import { encodeUtf8AsHex } from './helpers';
import type { useWebSerial } from '@/hooks/useWebSerial';

interface CompileResponse {
  success?: boolean;
  log?: string;
  hex?: string;
  requestId?: string;
  compiledFiles?: number;
}

interface CompileControllerValue {
  isCompiling: boolean;
  supportsDeviceFiles: boolean;

  boardSupportNote?: string;
}

const CompileControllerContext = createContext<CompileControllerValue | null>(null);

type WebSerialController = ReturnType<typeof useWebSerial>;

export function useCompileFlow(webSerial: WebSerialController): CompileControllerValue {
  const eventBus = useSplitViewEventBus();
  const {
    boardConfig,
    currentBoard,
    compileStrategy,
    currentGenerator,
    sourceCode,
    isBlockMode,
    syncBlocklySourceCode,
    micropythonProjectDirectories,
    micropythonProjectFiles,
    arduinoProjectFiles,
    arduinoEntryFilePath,
  } = useEditorOrchestrator();
  const [isCompiling, setIsCompiling] = useState(false);
  const supportsDeviceFiles = boardConfig?.uploadTransport === 'micropython-raw-repl';
  const boardSupportNote = boardConfig?.supportNote;

  const arduinoCompileScopeLabel = arduinoProjectFiles.length > 1 ? `project (${arduinoProjectFiles.length} files)` : 'sketch';

  const reportUnsupportedBoardAction = useCallback(
    (action: string) => {
      const detail = boardSupportNote ? ` ${boardSupportNote}` : '';
      webSerial.addMessage('error', `${action} is not available for ${currentBoard}.${detail}`.trim());
    },
    [boardSupportNote, currentBoard, webSerial],
  );

  const openBlockTerminalTab = useCallback(
    (tab: 'serial' | 'build' | 'connection') => {
      eventBus.emit('layout:block-terminal-request', { tab, open: true });
    },
    [eventBus],
  );

  const buildArduinoCompilePayload = useCallback(
    () => ({
      board: currentBoard,
      sourceCode,
      files: arduinoProjectFiles.length > 0 ? arduinoProjectFiles : undefined,
      entryFilePath: arduinoEntryFilePath ?? undefined,
    }),
    [arduinoEntryFilePath, arduinoProjectFiles, currentBoard, sourceCode],
  );

  const handleVerify = useCallback(async () => {
    openBlockTerminalTab('build');
    
    if (compileStrategy === 'unsupported') {
      reportUnsupportedBoardAction('Compilation');
      return;
    }

    if (supportsDeviceFiles) {
      webSerial.addMessage('system', 'MicroPython code is validated on device upload. Use Upload.');
      return;
    }

    setIsCompiling(true);
    
    webSerial.addMessage('system', `Compiling ${arduinoCompileScopeLabel} for ${currentBoard}...`);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const payload = buildArduinoCompilePayload();
      
      const result = await invoke<string>('compile_sketch', { payload }).catch(err => {
        throw new Error(err as string);
      });

      
      webSerial.addMessage('system', 'Compilation successful.');
      const lines = result.split('\n').filter((line) => line.trim().length > 0);
      lines.forEach((line) => webSerial.addMessage('app', line));
    } catch (error) {
      const message = `Compilation failed: ${(error as Error).message}`;
      webSerial.addMessage('error', message);
    } finally {
      setIsCompiling(false);
    }
  }, [arduinoCompileScopeLabel, buildArduinoCompilePayload, compileStrategy, currentBoard, openBlockTerminalTab, reportUnsupportedBoardAction, supportsDeviceFiles, webSerial]);

  const syncMicroPythonProjectToDevice = useCallback(async () => {
    if (micropythonProjectFiles.length === 0) {
      throw new Error('No MicroPython files found in this project.');
    }

    if (micropythonProjectDirectories.length > 0) {
      const mkdirScript = `import os\nfor _path in ${JSON.stringify(micropythonProjectDirectories)}:\n try:\n  os.mkdir(_path)\n except OSError:\n  pass\nprint("READY")`;
      await webSerial.runMicroPythonCommand(mkdirScript, 12000);
    }

    for (const file of micropythonProjectFiles) {
      const writeScript = `import binascii\nwith open(${JSON.stringify(file.path)}, "wb") as _target:\n _target.write(binascii.unhexlify(${JSON.stringify(encodeUtf8AsHex(file.content))}))\nprint("OK")`;
      const timeoutMs = Math.max(10000, file.content.length * 8);
      await webSerial.runMicroPythonCommand(writeScript, timeoutMs);
      webSerial.addMessage('system', `Synced ${file.path}`);
    }

    webSerial.addMessage('system', 'Files saved to the MicroPython device.');
    if (sourceCode.trim()) {
      webSerial.addMessage('system', 'Running main.py from the synced project...');
      await webSerial.executeMicroPythonRaw(sourceCode);
    }
  }, [micropythonProjectDirectories, micropythonProjectFiles, sourceCode, webSerial]);

  const handleUploadToBoard = useCallback(async () => {
    openBlockTerminalTab('build');
    
    if (compileStrategy === 'unsupported' || boardConfig?.uploadTransport === 'unsupported') {
      reportUnsupportedBoardAction('Upload');
      return;
    }

    if (!webSerial.isConnected) {
      webSerial.addMessage('error', 'Device not connected. Click Connect Device first.');
      return;
    }

    if (supportsDeviceFiles) {
      setIsCompiling(true);
      webSerial.addMessage('system', `Syncing ${micropythonProjectFiles.length} MicroPython file(s) to ${currentBoard}...`);
      try {
        await syncMicroPythonProjectToDevice();
      } catch (error) {
        webSerial.addMessage('error', `MicroPython sync failed: ${(error as Error).message}`);
      } finally {
        setIsCompiling(false);
      }
      return;
    }

    setIsCompiling(true);
    
    webSerial.addMessage('system', `Compiling ${arduinoCompileScopeLabel} for ${currentBoard} before upload...`);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const payload = buildArduinoCompilePayload();
      
      const result = await invoke<string>('upload_sketch', { payload, port: '' }).catch(err => {
        throw new Error(err as string);
      });

      
      webSerial.addMessage('system', 'Upload successful.');
      const lines = result.split('\n').filter((line) => line.trim().length > 0);
      lines.forEach((line) => webSerial.addMessage('app', line));
    } catch (error) {
      const message = `Upload failed: ${(error as Error).message}`;
      webSerial.addMessage('error', message);
    } finally {
      setIsCompiling(false);
    }
  }, [
    arduinoCompileScopeLabel,
    boardConfig?.uploadTransport,
    buildArduinoCompilePayload,
    compileStrategy,
    currentBoard,
    micropythonProjectFiles.length,
    openBlockTerminalTab,
    reportUnsupportedBoardAction,
    supportsDeviceFiles,
    syncMicroPythonProjectToDevice,
    webSerial,
  ]);

  const handleConnectDevice = useCallback(() => {
    openBlockTerminalTab('connection');
    if (webSerial.isConnected) {
      webSerial.disconnect();
    } else {
      webSerial.connect(115200);
    }
  }, [openBlockTerminalTab, webSerial]);



  useEffect(() => eventBus.on('compile:verify-request', () => { void handleVerify(); }), [eventBus, handleVerify]);
  useEffect(() => eventBus.on('compile:upload-request', () => { void handleUploadToBoard(); }), [eventBus, handleUploadToBoard]);
  useEffect(() => eventBus.on('device:connect-toggle-request', () => { handleConnectDevice(); }), [eventBus, handleConnectDevice]);


  return useMemo(
    () => ({
      isCompiling,
      supportsDeviceFiles,

      boardSupportNote,
    }),
    [boardSupportNote, isCompiling, supportsDeviceFiles],
  );
}

export function CompileController({ children, webSerial }: { children: ReactNode; webSerial: WebSerialController }) {
  const value = useCompileFlow(webSerial);
  return <CompileControllerContext.Provider value={value}>{children}</CompileControllerContext.Provider>;
}

export function useCompileController() {
  const context = useContext(CompileControllerContext);
  if (!context) {
    throw new Error('useCompileController must be used within CompileController');
  }
  return context;
}

