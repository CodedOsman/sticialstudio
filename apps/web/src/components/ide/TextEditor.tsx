"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  clampEditorFontSize,
  MAX_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
  useStudioPreferences,
  type EditorReadabilityMode,
} from '@/contexts/StudioPreferencesContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeMode } from '@/contexts/ThemeContext';
import { Plus, Minus } from 'lucide-react';
import { registerArduinoCompletions } from './monacoConfigs';
import { ensureMonacoBootstrap } from '@/lib/monaco/bootstrap';
import { normalizedRuntimeErrorToError } from '@/lib/runtime/normalizeRuntimeError';



const THEMES: Record<string, editor.IStandaloneThemeData> = {
  'sticial-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a8a60' },
      { token: 'comment.block', foreground: '6a8a60' },
      { token: 'keyword', foreground: 'b5580c' },
      { token: 'keyword.control', foreground: 'b5580c' },
      { token: 'storage.type', foreground: 'b5580c' },
      { token: 'number', foreground: '0b6f9e' },
      { token: 'number.float', foreground: '0b6f9e' },
      { token: 'number.hex', foreground: '0b6f9e' },
      { token: 'string', foreground: 'a44e00' },
      { token: 'string.escape', foreground: 'c16000' },
      { token: 'entity.name.function', foreground: '1a55a6' },
      { token: 'support.function', foreground: '1a55a6' },
      { token: 'keyword.directive', foreground: '7a3b8c' },
      { token: 'meta.preprocessor', foreground: '7a3b8c' },
      { token: 'constant', foreground: '0b6f9e' },
      { token: 'variable', foreground: '1e293b' },
      { token: 'operator', foreground: '2d3a8c' },
      { token: 'delimiter.bracket', foreground: '334155' },
      { token: 'delimiter', foreground: '334155' },
    ],
    colors: {
      'editor.background': '#faf8f5',
      'editor.foreground': '#1e293b',
      'editor.lineHighlightBackground': '#eff3fa',
      'editor.lineHighlightBorder': '#dde4f0',
      'editor.selectionBackground': '#ccd9f880',
      'editor.inactiveSelectionBackground': '#ccd9f840',
      'editorLineNumber.foreground': '#a0adc0',
      'editorLineNumber.activeForeground': '#3047a6',
      'editorGutter.background': '#f2efea',
      'editorCursor.foreground': '#3047a6',
      'editorIndentGuide.background1': '#e2e8f0',
      'editorIndentGuide.activeBackground1': '#c4cedf',
      'editorBracketMatch.background': '#ccd9f860',
      'editorBracketMatch.border': '#3047a6',
      'editor.findMatchBackground': '#ffe58080',
      'editor.findMatchHighlightBackground': '#ffe58040',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#d1daea',
      'scrollbarSlider.background': '#3047a622',
      'scrollbarSlider.hoverBackground': '#3047a633',
      'scrollbarSlider.activeBackground': '#3047a644',
      'minimap.background': '#f2efea',
    },
  },
  'sticial-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a8a7a' },
      { token: 'comment.block', foreground: '6a8a7a' },
      { token: 'keyword', foreground: 'e8834d' },
      { token: 'keyword.control', foreground: 'e8834d' },
      { token: 'storage.type', foreground: 'e8834d' },
      { token: 'number', foreground: '52b8c8' },
      { token: 'number.float', foreground: '52b8c8' },
      { token: 'number.hex', foreground: '52b8c8' },
      { token: 'string', foreground: 'eb9b78' },
      { token: 'string.escape', foreground: 'f0aa88' },
      { token: 'entity.name.function', foreground: '82aaff' },
      { token: 'support.function', foreground: '82aaff' },
      { token: 'keyword.directive', foreground: 'c792ea' },
      { token: 'meta.preprocessor', foreground: 'c792ea' },
      { token: 'constant', foreground: '7fdbca' },
      { token: 'variable', foreground: 'cdd5e0' },
      { token: 'operator', foreground: 'c3a6ff' },
      { token: 'delimiter.bracket', foreground: 'ffd700' },
      { token: 'delimiter', foreground: 'cdd5e0' },
    ],
    colors: {
      'editor.background': '#0d1526',
      'editor.foreground': '#cdd5e0',
      'editor.lineHighlightBackground': '#16213a',
      'editor.lineHighlightBorder': '#1e3050',
      'editor.selectionBackground': '#5f7bf740',
      'editor.inactiveSelectionBackground': '#5f7bf720',
      'editorLineNumber.foreground': '#3a4d6a',
      'editorLineNumber.activeForeground': '#7f96ff',
      'editorGutter.background': '#09101e',
      'editorCursor.foreground': '#7f96ff',
      'editorIndentGuide.background1': '#1e3050',
      'editorIndentGuide.activeBackground1': '#2a4570',
      'editorBracketMatch.background': '#5f7bf730',
      'editorBracketMatch.border': '#5f7bf7',
      'editor.findMatchBackground': '#5f7bf750',
      'editor.findMatchHighlightBackground': '#5f7bf730',
      'editorWidget.background': '#111c30',
      'editorWidget.border': '#1e3050',
      'scrollbarSlider.background': '#3a4d6a33',
      'scrollbarSlider.hoverBackground': '#3a4d6a55',
      'scrollbarSlider.activeBackground': '#5f7bf744',
      'minimap.background': '#09101e',
    },
  },
  'sticial-magma': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7a635f' },
      { token: 'comment.block', foreground: '7a635f' },
      { token: 'keyword', foreground: 'f97316' },
      { token: 'keyword.control', foreground: 'f97316' },
      { token: 'storage.type', foreground: 'f97316' },
      { token: 'number', foreground: 'ffb347' },
      { token: 'number.float', foreground: 'ffb347' },
      { token: 'number.hex', foreground: 'ffb347' },
      { token: 'string', foreground: 'fca97e' },
      { token: 'string.escape', foreground: 'ffb8a0' },
      { token: 'entity.name.function', foreground: 'ffd580' },
      { token: 'support.function', foreground: 'ffd580' },
      { token: 'keyword.directive', foreground: 'ff9070' },
      { token: 'meta.preprocessor', foreground: 'ff9070' },
      { token: 'constant', foreground: '5cd18d' },
      { token: 'variable', foreground: 'f7ede8' },
      { token: 'operator', foreground: 'ffc090' },
      { token: 'delimiter.bracket', foreground: 'ffb347' },
      { token: 'delimiter', foreground: 'f7ede8' },
    ],
    colors: {
      'editor.background': '#1a0f10',
      'editor.foreground': '#f7ede8',
      'editor.lineHighlightBackground': '#261518',
      'editor.lineHighlightBorder': '#3a1e20',
      'editor.selectionBackground': '#f9731640',
      'editor.inactiveSelectionBackground': '#f9731620',
      'editorLineNumber.foreground': '#5a3635',
      'editorLineNumber.activeForeground': '#f97316',
      'editorGutter.background': '#130b0c',
      'editorCursor.foreground': '#f97316',
      'editorIndentGuide.background1': '#3a1e20',
      'editorIndentGuide.activeBackground1': '#5a2e30',
      'editorBracketMatch.background': '#f9731630',
      'editorBracketMatch.border': '#f97316',
      'editor.findMatchBackground': '#f9731650',
      'editor.findMatchHighlightBackground': '#f9731630',
      'editorWidget.background': '#2a1a1a',
      'editorWidget.border': '#3a1e20',
      'scrollbarSlider.background': '#5a363522',
      'scrollbarSlider.hoverBackground': '#5a363544',
      'scrollbarSlider.activeBackground': '#f9731630',
      'minimap.background': '#130b0c',
    },
  },
};

function getMonacoThemeName(platformTheme: ThemeMode): string {
  switch (platformTheme) {
    case 'dark':
      return 'sticial-dark';
    case 'magma':
      return 'sticial-magma';
    default:
      return 'sticial-light';
  }
}

const HEADER_STYLES: Record<ThemeMode, { bg: string; border: string; fg: string; badge: string; badgeText: string }> = {
  light: {
    bg: '#f2efea',
    border: '#dde4f0',
    fg: '#3047a6',
    badge: '#eff3fa',
    badgeText: '#526173',
  },
  dark: {
    bg: '#09101e',
    border: '#1e3050',
    fg: '#7f96ff',
    badge: '#16213a',
    badgeText: '#7e8aa8',
  },
  magma: {
    bg: '#130b0c',
    border: '#3a1e20',
    fg: '#f97316',
    badge: '#261518',
    badgeText: '#a98780',
  },
};


type EditorTypography = {
  readabilityMode: boolean;
  fontLigatures: boolean;
  lineHeight: number;
  letterSpacing: number;
  paddingTop: number;
  paddingBottom: number;
};

function getEditorTypography(fontSize: number, readabilityPreference: EditorReadabilityMode): EditorTypography {
  if (fontSize >= 26) {
    return {
      readabilityMode: true,
      fontLigatures: false,
      lineHeight: Math.round(fontSize * 1.92),
      letterSpacing: 0,
      paddingTop: 18,
      paddingBottom: 32,
    };
  }

  if (readabilityPreference === 'always' || fontSize >= 20) {
    return {
      readabilityMode: true,
      fontLigatures: false,
      lineHeight: Math.round(fontSize * 1.82),
      letterSpacing: 0.08,
      paddingTop: 16,
      paddingBottom: 28,
    };
  }

  return {
    readabilityMode: false,
    fontLigatures: true,
    lineHeight: Math.round(fontSize * 1.68),
    letterSpacing: 0.24,
    paddingTop: 14,
    paddingBottom: 24,
  };
}

const MONACO_THEME_REGISTRY_FLAG = "__sticial_monaco_themes_registered__";

function hasRegisteredMonacoThemes() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean((window as unknown as Record<string, unknown>)[MONACO_THEME_REGISTRY_FLAG]);
}

function markMonacoThemesRegistered() {
  if (typeof window === "undefined") {
    return;
  }

  (window as unknown as Record<string, unknown>)[MONACO_THEME_REGISTRY_FLAG] = true;
}
interface TextEditorProps {
  code: string;
  language: string;
  onChange?: (val: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  hideHeader?: boolean;
  fileName?: string;
  runtimeLabel?: string;
  workspaceLabel?: string;
  saveHint?: string;
}

export default function TextEditor({
  code,
  language,
  onChange,
  onSave,
  readOnly = false,
  hideHeader = false,
  fileName,
  runtimeLabel,
  workspaceLabel,
  saveHint,
}: TextEditorProps) {
  const [monacoInstance, setMonacoInstance] = useState<typeof import('monaco-editor') | null>(null);
  const [monacoLoadError, setMonacoLoadError] = useState<Error | null>(null);
  const { theme } = useTheme();
  const themesRegisteredRef = useRef(false);
  const saveActionBoundEditorsRef = useRef(new WeakSet<editor.IStandaloneCodeEditor>());
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const compileDecorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const lastRevealedCompileLineRef = useRef<number | null>(null);
  const compileFeedback = null;
  const errorText = null;
  const {
    editorFontSize: fontSize,
    editorReadabilityMode,
    editorWordWrap,
    setEditorFontSize,
  } = useStudioPreferences();
  const monacoThemeName = getMonacoThemeName(theme);


  useEffect(() => {
    let cancelled = false;

    ensureMonacoBootstrap()
      .then((instance) => {
        if (cancelled) {
          return;
        }
        setMonacoInstance(instance);
        setMonacoLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const normalizedError = normalizedRuntimeErrorToError(error, 'Monaco failed to load local editor assets.');
        console.error('Monaco bootstrap failed', {
          error: normalizedError,
          details: (normalizedError as Error & { details?: unknown }).details,
        });
        setMonacoLoadError(normalizedError);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const registerThemes = useCallback(() => {
    if (!monacoInstance || themesRegisteredRef.current) return;
    themesRegisteredRef.current = true;
    Object.entries(THEMES).forEach(([name, def]) => {
      monacoInstance.editor.defineTheme(name, def);
    });

    registerArduinoCompletions(monacoInstance);
  }, [monacoInstance]);

  const handleEditorDidMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, mountedMonaco: typeof import('monaco-editor')) => {
      if (!mountedMonaco) return;

      editorRef.current = editorInstance;
      monacoRef.current = mountedMonaco;

      if (saveActionBoundEditorsRef.current.has(editorInstance)) {
        return;
      }

      if (editorInstance.getAction('save-file')) {
        saveActionBoundEditorsRef.current.add(editorInstance);
        return;
      }

      saveActionBoundEditorsRef.current.add(editorInstance);
      editorInstance.addAction({
        id: 'save-file',
        label: 'Save Project',
        keybindings: [mountedMonaco.KeyMod.CtrlCmd | mountedMonaco.KeyCode.KeyS],
        run: () => {
          if (onSave) onSave();
        },
      });
    },
    [onSave]
  );

  useEffect(() => {
    if (!monacoInstance) return;
    registerThemes();
  }, [monacoInstance, registerThemes]);



  const monacoLang = language === 'python' ? 'python' : 'cpp';
  const label = fileName || (language === 'python' ? 'main.py' : 'main.cpp');
  const runtime = runtimeLabel || (language === 'python' ? 'MicroPython' : 'Arduino C++');
  const workspace = workspaceLabel || 'Scratch workspace';
  const shortcutHint = saveHint || (onSave ? 'Ctrl/Cmd+S Save' : null);

  const hs = HEADER_STYLES[theme];
  const editorBg = THEMES[monacoThemeName]?.colors?.['editor.background'] as string | undefined;
  const bgStyle = editorBg ? `${editorBg}` : 'var(--ui-color-background)';
  const editorTypography = useMemo(() => getEditorTypography(fontSize, editorReadabilityMode), [editorReadabilityMode, fontSize]);

  if (monacoLoadError) {
    throw monacoLoadError;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ background: bgStyle }}>
      {!hideHeader ? (
        <div
          className="flex min-h-12 flex-shrink-0 items-center justify-between gap-3 border-b px-4 py-2"
          style={{ background: hs.bg, borderColor: hs.border }}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-[8px] border px-3 py-1 text-xs font-semibold"
              style={{ background: bgStyle, borderColor: hs.border, color: hs.fg }}
              title={label}
            >
              {label}
            </span>
            <span
              className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ background: hs.badge, borderColor: hs.border, color: hs.badgeText }}
              title={runtime}
            >
              {runtime}
            </span>
            <span
              className="max-w-[18rem] truncate rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ background: hs.badge, borderColor: hs.border, color: hs.badgeText }}
              title={workspace}
            >
              {workspace}
            </span>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {shortcutHint ? (
              <span
                className="hidden rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] lg:inline-flex"
                style={{ background: hs.badge, borderColor: hs.border, color: hs.badgeText }}
              >
                {shortcutHint}
              </span>
            ) : null}

            <div
              className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-semibold transition-colors"
              style={{ color: hs.fg, background: hs.badge }}
            >
              <button
                onClick={() => setEditorFontSize(clampEditorFontSize(fontSize - 1))}
                className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
                title="Decrease font size"
                disabled={fontSize <= MIN_EDITOR_FONT_SIZE}
              >
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <span className="w-7 text-center font-mono text-[10px]">{fontSize}</span>
              <button
                onClick={() => setEditorFontSize(clampEditorFontSize(fontSize + 1))}
                className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
                title="Increase font size"
                disabled={fontSize >= MAX_EDITOR_FONT_SIZE}
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      ) : null}



      <div className="min-h-0 flex-1 overflow-hidden" style={{ background: bgStyle }}>
        {monacoInstance ? (
          <Editor
            height="100%"
            language={monacoLang}
            theme={monacoThemeName}
            value={code}
            onMount={handleEditorDidMount}
            onChange={(val) => {
              if (onChange && val !== undefined && !readOnly) {
                onChange(val);
              }
            }}
            options={{
              readOnly,
              fontFamily: "var(--font-editor-mono), 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
              fontLigatures: editorTypography.fontLigatures,
              fontSize,
              lineHeight: editorTypography.lineHeight,
              letterSpacing: editorTypography.letterSpacing,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: editorTypography.readabilityMode ? 'blink' : 'smooth',
              cursorSmoothCaretAnimation: editorTypography.readabilityMode ? 'off' : 'on',
              automaticLayout: true,
              lineNumbersMinChars: 3,
              lineDecorationsWidth: 12,
              glyphMargin: true,
              folding: true,
              foldingHighlight: true,
              renderLineHighlightOnlyWhenFocus: false,
              bracketPairColorization: { enabled: true },
              matchBrackets: 'always',
              guides: { indentation: true, bracketPairs: true },
              overviewRulerBorder: false,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
                useShadows: false,
              },
              wordWrap: editorWordWrap === 'on' ? 'on' : 'off',
              renderWhitespace: 'none',
              padding: { top: editorTypography.paddingTop, bottom: editorTypography.paddingBottom },
              quickSuggestionsDelay: 100,
              suggest: { showKeywords: true, showSnippets: true },
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ui-color-text-soft)]">Loading editor</p>
              <p className="text-xs leading-6 text-[var(--ui-color-text-muted)]">Preparing local Monaco editor assets for offline-safe editing.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


