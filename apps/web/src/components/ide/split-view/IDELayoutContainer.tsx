'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { CircuitBoard, Code2 } from 'lucide-react';
import type { useWebSerial } from '@/hooks/useWebSerial';
import { useTheme } from '@/contexts/ThemeContext';
import { useStudioPreferences } from '@/contexts/StudioPreferencesContext';
import { useProject } from '@/contexts/ProjectContext';
import { useEditorStore } from '@/stores/editorStore';
import { useBlocklyStore } from '@/stores/blocklyStore';
import TopToolbar from '../TopToolbar';
import CodingEnvironmentTopBar from '../coding-environment/TopBar';
import BlocklyWorkspace from '../BlocklyWorkspace';
import TerminalPanel from '../TerminalPanel';
import BlockTerminalShell from '../BlockTerminalShell';
import FileExplorer from '../FileExplorer';
import WorkspaceGuidance from '../WorkspaceGuidance';
import IdeShellFrame from '../IdeShellFrame';
import IdeActivityBar from '../IdeActivityBar';
import IdeStatusBar from '../IdeStatusBar';
import IdeLeftRail from '../IdeLeftRail';
import IdeRightContextPanel, { type IdeRightContextView } from '../IdeRightContextPanel';
import IdeBottomDock from '../IdeBottomDock';
import DeviceFiles from '../DeviceFiles';
import BoardStatusPanel from '../BoardStatusPanel';
import VirtualProjectRail from '../VirtualProjectRail';
import AiChatPanel from '../AiChatPanel';
import LibraryHub from '../LibraryHub';
import PreferencesDialog from '../PreferencesDialog';
import { IDEErrorBoundary } from '../ErrorBoundary';
import SaveProjectModal from './SaveProjectModal';
import NewSketchDialog from './NewSketchDialog';
import { LEFT_PANEL_WIDTH, RIGHT_PANEL_WIDTH } from './constants';
import { useSplitViewEventBus } from './SplitViewEventBus';
import { useEditorOrchestrator } from './EditorOrchestrator';

import { useCompileController } from './CompileController';
import { useAutoSaveManager } from './AutoSaveManager';
import { useIDELayoutState } from './hooks/useIDELayoutState';

const TextEditor = dynamic(() => import('../TextEditor'), { ssr: false });


type WebSerialController = ReturnType<typeof useWebSerial>;

function CodeGuidanceCard({
  isBlockMode,
}: {
  isBlockMode: boolean;
}) {
  return (
    <WorkspaceGuidance
      eyebrow="Next Step"
      title={isBlockMode ? 'Add your first blocks' : 'Write your first code'}
      description={isBlockMode ? 'Choose a block category on the left, drag logic into the workspace, and use the generated code panel to follow what is happening.' : 'Start with setup and loop for Arduino C++, or write your MicroPython script before you run or upload it.'}
      chips={isBlockMode ? ['Open blocks', 'Generate code', 'Save when ready'] : ['Write code', 'Save project', 'Run when ready']}
      icon={<Code2 size={18} />}
      compact
      actions={[]}
    />
  );
}

export default function IDELayoutContainer({ webSerial }: { webSerial: WebSerialController }) {
  const router = useRouter();
  const eventBus = useSplitViewEventBus();
  const { theme, setTheme } = useTheme();
  const {
    autoSave,
    showAdvancedBlocks,
    editorFontSize,
    editorWordWrap,
    editorReadabilityMode,
    isPreferencesOpen,
    openPreferences,
    closePreferences,
    setAutoSave,
    setShowAdvancedBlocks,
    setEditorFontSize,
    setEditorWordWrap,
    setEditorReadabilityMode,
    resetPreferences,
  } = useStudioPreferences();
  const { projectName, setProjectName, projectId, refreshProjectFiles, saveProject, startNewSketch } = useProject();
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges);
  const editor = useEditorOrchestrator();
  const compile = useCompileController();
  const autoSaveManager = useAutoSaveManager();

  const layout = useIDELayoutState({
    environment: editor.environment,
    isBlockMode: editor.isBlockMode,
    supportsDeviceFiles: compile.supportsDeviceFiles,
    editorFontSize,
  });

  const shouldShowCodeGuidance = !editor.isBlockMode && editor.sourceCode.trim().length === 0;


  const rightViews = useMemo<IdeRightContextView[]>(() => {
    const views: IdeRightContextView[] = [
      {
        id: 'ai-chat',
        label: 'AI Chat',
        tone: 'violet',
        content: <AiChatPanel />,
      },
      {
        id: 'status',
        label: 'Status',
        tone: 'slate',
        content: (
          <BoardStatusPanel
            boardName={editor.currentBoard}
            codingMode={editor.codingMode}
            environment={editor.environment}
            isConnected={webSerial.isConnected}
          />
        ),
      },
    ];

    if (compile.supportsDeviceFiles) {
      views.unshift({
        id: 'device',
        label: 'Device',
        tone: 'cyan',
        content: <DeviceFiles webSerial={webSerial} />,
      });
    }

    return views;
  }, [compile.supportsDeviceFiles, editor.codingMode, editor.currentBoard, editor.environment, webSerial]);

  React.useEffect(() => {
    if (!rightViews.some((view) => view.id === layout.rightPanelView)) {
      layout.setRightPanelView(layout.defaultRightView);
    }
  }, [layout, rightViews]);

  const runtimeLabel = editor.boardConfig?.runtimeLabel || (editor.currentLanguage === 'python' ? 'MicroPython' : 'Arduino C++');
  const [isNewSketchDialogOpen, setIsNewSketchDialogOpen] = React.useState(false);
  const [isSavingBeforeNewSketch, setIsSavingBeforeNewSketch] = React.useState(false);
  const pendingNewSketchAfterSaveRef = React.useRef(false);

  const executeNewSketch = React.useCallback(() => {
    pendingNewSketchAfterSaveRef.current = false;
    setIsNewSketchDialogOpen(false);
    setIsSavingBeforeNewSketch(false);
    startNewSketch();

    if (editor.environment === 'virtual') {
      layout.setStudioView('circuit');
    }
  }, [editor.environment, layout, startNewSketch]);

  const handleRequestNewSketch = React.useCallback(() => {
    if (!hasUnsavedChanges) {
      executeNewSketch();
      return;
    }

    setIsNewSketchDialogOpen(true);
  }, [executeNewSketch, hasUnsavedChanges]);

  const handleCancelNewSketch = React.useCallback(() => {
    pendingNewSketchAfterSaveRef.current = false;
    setIsSavingBeforeNewSketch(false);
    setIsNewSketchDialogOpen(false);
  }, []);

  const handleDiscardNewSketch = React.useCallback(() => {
    executeNewSketch();
  }, [executeNewSketch]);

  const handleSaveThenNewSketch = React.useCallback(async () => {
    if (!hasUnsavedChanges) {
      executeNewSketch();
      return;
    }

    if (!projectId) {
      pendingNewSketchAfterSaveRef.current = true;
      setIsNewSketchDialogOpen(false);
      eventBus.emit('project:save-request', { origin: 'manual' });
      return;
    }

    setIsSavingBeforeNewSketch(true);
    try {
      await saveProject();
      executeNewSketch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save before starting a new sketch.';
      webSerial.addMessage('error', message);
    } finally {
      setIsSavingBeforeNewSketch(false);
    }
  }, [eventBus, executeNewSketch, hasUnsavedChanges, projectId, saveProject, webSerial]);

  const handleCloseSaveProjectModal = React.useCallback(() => {
    pendingNewSketchAfterSaveRef.current = false;
    autoSaveManager.closeSaveModal();
  }, [autoSaveManager]);

  React.useEffect(() => {
    return eventBus.on('FILE_SAVED', () => {
      if (pendingNewSketchAfterSaveRef.current) {
        executeNewSketch();
      }
    });
  }, [eventBus, executeNewSketch]);

  const handleResetEditorZone = React.useCallback(async () => {
    useBlocklyStore.getState().resetBlocklyState();

    if (projectId) {
      await refreshProjectFiles();
    }
  }, [projectId, refreshProjectFiles]);

  const handleResetFileExplorerZone = React.useCallback(async () => {
    if (projectId) {
      await refreshProjectFiles();
    }
  }, [projectId, refreshProjectFiles]);



  const handleResetTerminalZone = React.useCallback(() => {
    webSerial.clearMessages();
  }, [webSerial]);

  const handleProjectNameChange = React.useCallback(
    (name: string) => {
      setProjectName(name);
      eventBus.emit('USER_EDITED', { source: 'project-meta', timestamp: Date.now() });
    },
    [eventBus, setProjectName],
  );

  const leftViews = useMemo(
    () => [
      {
        id: 'files',
        label: 'Files',
        content: (
          <IDEErrorBoundary
            zone="File Explorer"
            compact
            title="File Explorer hit a problem"
            description="The project file tree crashed. You can reload just the explorer or refresh its state without leaving the IDE."
            onResetState={handleResetFileExplorerZone}
          >
            <FileExplorer />
          </IDEErrorBoundary>
        ),
      },
      { id: 'libraries', label: 'Libraries', content: <LibraryHub /> },
    ],
    [handleResetFileExplorerZone],
  );

  const preferencesDialog = (
    <PreferencesDialog
      open={isPreferencesOpen}
      theme={theme}
      autoSave={autoSave}
      showAdvancedBlocks={showAdvancedBlocks}
      editorFontSize={editorFontSize}
      editorWordWrap={editorWordWrap}
      editorReadabilityMode={editorReadabilityMode}
      onClose={closePreferences}
      onThemeChange={setTheme}
      onAutoSaveChange={setAutoSave}
      onShowAdvancedBlocksChange={setShowAdvancedBlocks}
      onEditorFontSizeChange={setEditorFontSize}
      onEditorWordWrapChange={setEditorWordWrap}
      onEditorReadabilityModeChange={setEditorReadabilityMode}
      onResetApp={() => {
        resetPreferences();
        setTheme('light');
        eventBus.emit('app:reset-request', undefined);
        closePreferences();
      }}
    />
  );

  const textCenterStage = (
    <div className="ui-foundation-panel relative flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-[30px]">
      <IDEErrorBoundary
        zone="Text Editor"
        title="The text editor hit a problem"
        description="Monaco or the text editor shell crashed. Reload this editor panel or reset its state while keeping the rest of the IDE open."
        onResetState={handleResetEditorZone}
      >
        <TextEditor
          code={editor.activeEditorCode}
          language={editor.activeEditorLanguage}
          fileName={editor.activeEditorFileName}
          runtimeLabel={runtimeLabel}
          workspaceLabel={editor.textEditorWorkspaceLabel}
          saveHint={editor.textEditorSaveHint}
          onChange={editor.handleActiveTextCodeChange}
          onSave={() => eventBus.emit('project:save-request', { origin: 'manual' })}
        />
      </IDEErrorBoundary>
    </div>
  );

  const leftStage = (
    <IdeLeftRail
      title="Project Rail"
      subtitle="Keep project files close while the editor stays in focus."
      views={leftViews}
      activeView={layout.leftRailView}
      onChangeView={layout.setLeftRailView}
    />
  );

  const bottomStage = (
    <IdeBottomDock
      collapsed={layout.bottomCollapsed}
      height={layout.terminalHeight}
      isCompact={layout.isCompact}
      onResizeStart={layout.handleTerminalResize}
      onToggleCollapsed={() => layout.setBottomCollapsed((prev) => !prev)}
    >
      <IDEErrorBoundary
        zone="Terminal"
        compact={layout.bottomCollapsed}
        title="The terminal hit a problem"
        description="Serial logs or the terminal UI crashed. Reload this panel or reset the terminal state without leaving the editor."
        onResetState={handleResetTerminalZone}
      >
        <TerminalPanel webSerial={webSerial} collapsed={layout.bottomCollapsed} />
      </IDEErrorBoundary>
    </IdeBottomDock>
  );

  const blockBottomStage = (
    <IdeBottomDock
      collapsed={layout.bottomCollapsed}
      height={layout.effectiveBlockTerminalHeight}
      isCompact={layout.isCompact}
      onResizeStart={layout.handleTerminalResize}
      onToggleCollapsed={() => layout.setBottomCollapsed((prev) => !prev)}
    >
      <IDEErrorBoundary
        zone="Terminal"
        compact={layout.bottomCollapsed}
        title="The block terminal hit a problem"
        description="Serial, build, or connection feedback for the block environment crashed. Reload this dock or reset its state without losing the rest of the workspace."
        onResetState={handleResetTerminalZone}
      >
        <BlockTerminalShell
          webSerial={webSerial}
          collapsed={layout.bottomCollapsed}
          requestedTab={layout.blockTerminalTab}
          onToggleCollapsed={() => layout.setBottomCollapsed((prev) => !prev)}
          onTabChange={layout.setBlockTerminalTab}
        />
      </IDEErrorBoundary>
    </IdeBottomDock>
  );

  const blockModeStage = (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      <IDEErrorBoundary zone="blockly-workspace" title="Block editor crashed">
        <BlocklyWorkspace
          generatorType={editor.currentGenerator || 'arduino'}
          initialXml={editor.blocklyXml}
          onCodeChange={editor.handleEntrySourceCodeChange}
          onXmlChange={editor.handleBlocklyXmlChange}
          onWorkspaceReady={editor.handleBlocklyWorkspaceReady}
          selectedCategoryName={editor.selectedBlocklyCategory}
          onSelectCategory={editor.setSelectedBlocklyCategory}
          sourceCode={editor.sourceCode}
          isCompact={layout.isCompact}
          bottomPanel={blockBottomStage}
          bottomCollapsed={layout.bottomCollapsed}
        />
      </IDEErrorBoundary>
    </div>
  );

  const virtualCodingStage = editor.isBlockMode ? (
    <div className="mt-4 flex min-h-0 flex-1">{blockModeStage}</div>
  ) : (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
      {shouldShowCodeGuidance ? (
        <CodeGuidanceCard isBlockMode={editor.isBlockMode} />
      ) : null}
      <div className="min-h-0 flex-1">
        <div className="h-full min-h-0 min-w-0">{textCenterStage}</div>
      </div>
    </div>
  );



  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0b0e14]">
      <TopToolbar
        projectName={projectName}
        boardName={editor.currentBoard}
        codingMode={editor.codingMode}
        environment={editor.environment}
        isConnected={webSerial.isConnected}
        isCompiling={compile.isCompiling}
        isSaving={autoSaveManager.isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        leftCollapsed={layout.leftCollapsed}
        rightCollapsed={layout.rightCollapsed}
        bottomCollapsed={layout.bottomCollapsed}
        showPanelControls={!editor.isBlockMode}
        onVerify={() => eventBus.emit('compile:verify-request', undefined)}
        onUpload={() => eventBus.emit('compile:upload-request', undefined)}
        onConnectDevice={() => eventBus.emit('device:connect-toggle-request', undefined)}
        onChangeBoard={(board) => editor.setCurrentBoard(board as any)}
        onSaveProject={() => eventBus.emit('project:save-request', { origin: 'manual' })}
        onOpenProject={() => router.push('/dashboard')}
        onNewSketch={handleRequestNewSketch}
        onOpenPreferences={openPreferences}
        onToggleLeft={layout.toggleLeftCollapsed}
        onToggleRight={layout.toggleRightCollapsed}
        onToggleBottom={() => layout.setBottomCollapsed((prev) => !prev)}
        saveStatusText={autoSaveManager.visibleSaveStatusText}
        saveStatusTone={autoSaveManager.visibleSaveStatusTone}
        variant={!editor.isBlockMode ? 'arduino-text' : 'default'}
        onChangeCodingMode={(mode) => eventBus.emit('editor:coding-mode-request', { mode })}
      />
      {preferencesDialog}

      {editor.isBlockMode ? (
        <div className="flex min-h-0 flex-1">{blockModeStage}</div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
          <IdeActivityBar
            activeView={layout.leftRailView}
            onChangeView={layout.setLeftRailView}
            isCollapsed={layout.leftCollapsed}
            onToggleCollapsed={layout.toggleLeftCollapsed}
            enabledViewIds={['files', 'libraries']}
          />

          <div className="relative flex min-h-0 flex-1 flex-col px-2">
            {shouldShowCodeGuidance ? (
              <div className="absolute left-1/2 top-4 z-40 w-full max-w-xl -translate-x-1/2 shadow-2xl">
                <CodeGuidanceCard isBlockMode={editor.isBlockMode} />
              </div>
            ) : null}

            <IdeShellFrame
              left={leftStage}
              center={textCenterStage}
              right={
                <IdeRightContextPanel
                  title="AI Assistant"
                  subtitle="Ask questions, get code help, and debug faster with AI."
                  views={rightViews}
                  activeView={layout.rightPanelView}
                  onChangeView={layout.setRightPanelView}
                />
              }
              bottom={bottomStage}
              leftCollapsed={layout.leftCollapsed}
              rightCollapsed={layout.rightCollapsed}
              leftWidth={LEFT_PANEL_WIDTH}
              rightWidth={RIGHT_PANEL_WIDTH}
            />
          </div>
        </div>
      )}

      {!editor.isBlockMode ? (
        <IdeStatusBar
          boardName={editor.currentBoard}
          isConnected={webSerial.isConnected}
          leftMessage={autoSaveManager.isSaving ? 'Saving...' : compile.isCompiling ? 'Compiling...' : 'Ready.'}
        />
      ) : null}

      <SaveProjectModal
          open={autoSaveManager.isSaveModalOpen}
          isSaving={autoSaveManager.isSaving}
          newProjectName={autoSaveManager.newProjectName}
          currentBoard={editor.currentBoard}
          runtimeLabel={runtimeLabel}
          onNameChange={autoSaveManager.setNewProjectName}
          onClose={handleCloseSaveProjectModal}
          onSubmit={() => void autoSaveManager.submitSaveModal()}
        />
        <NewSketchDialog
          open={isNewSketchDialogOpen}
          isSavingFirst={isSavingBeforeNewSketch}
          onCancel={handleCancelNewSketch}
          onDiscard={handleDiscardNewSketch}
          onSaveFirst={() => void handleSaveThenNewSketch()}
        />
    </div>
  );
}





