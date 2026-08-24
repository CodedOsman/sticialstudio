"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { BOARD_CONFIG } from '../lib/boards/boardConfig';

export type BoardKey = keyof typeof BOARD_CONFIG;
export type CodingMode = 'block' | 'text' | null;
export type HardwareEnvironment = 'virtual' | 'physical';

export interface PendingProjectIntent {
    source: 'wizard' | 'course';
    projectName?: string | null;
}

export interface BoardContextValue {
    currentBoard: BoardKey;
    setCurrentBoard: (board: BoardKey) => void;
    codingMode: CodingMode;
    setCodingMode: (mode: CodingMode) => void;
    language: string | null;
    setLanguage: (lang: string | null) => void;
    generator: string | null;
    setGenerator: (gen: string | null) => void;
    compileStrategy: string;
    isFullScreen: boolean;
    setIsFullScreen: (val: boolean) => void;
    environment: HardwareEnvironment | null;
    setEnvironment: (env: HardwareEnvironment) => void;
    pendingProjectIntent: PendingProjectIntent | null;
    setPendingProjectIntent: (intent: PendingProjectIntent | null) => void;
    clearPendingProjectIntent: () => void;
    hasHydrated: boolean;
}

interface PersistedBoardState {
    currentBoard?: BoardKey;
    codingMode?: CodingMode;
    language?: string | null;
    generator?: string | null;
    environment?: HardwareEnvironment | null;
    pendingProjectIntent?: PendingProjectIntent | null;
}

const STORAGE_KEY = 'edtech-board-context';
const BoardContext = createContext<BoardContextValue | undefined>(undefined);

function isBoardKey(value: unknown): value is BoardKey {
    return typeof value === 'string' && value in BOARD_CONFIG;
}

function isCodingMode(value: unknown): value is CodingMode {
    return value === 'block' || value === 'text' || value === null;
}

function isEnvironment(value: unknown): value is HardwareEnvironment {
    return value === 'virtual' || value === 'physical';
}

function normalizePendingProjectIntent(value: unknown): PendingProjectIntent | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const source = (value as PendingProjectIntent).source;
    const projectName = (value as PendingProjectIntent).projectName;
    if (source !== 'wizard' && source !== 'course') {
        return null;
    }

    return {
        source,
        projectName: typeof projectName === 'string' && projectName.trim().length > 0 ? projectName.trim() : null,
    };
}

function readStoredBoardState(): PersistedBoardState {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as PersistedBoardState;
        return {
            currentBoard: isBoardKey(parsed.currentBoard) ? parsed.currentBoard : undefined,
            codingMode: isCodingMode(parsed.codingMode) ? parsed.codingMode : undefined,
            language: typeof parsed.language === 'string' ? parsed.language : null,
            generator: typeof parsed.generator === 'string' ? parsed.generator : null,
            environment: isEnvironment(parsed.environment) ? parsed.environment : null,
            pendingProjectIntent: normalizePendingProjectIntent(parsed.pendingProjectIntent),
        };
    } catch {
        return {};
    }
}

export function BoardProvider({ children }: { children: ReactNode }) {
    const initialState = readStoredBoardState();
    const defaultBoard: BoardKey = 'Arduino Uno' in BOARD_CONFIG
        ? 'Arduino Uno'
        : (Object.keys(BOARD_CONFIG)[0] as BoardKey);

    const [currentBoard, setCurrentBoard] = useState<BoardKey>(initialState.currentBoard ?? defaultBoard);
    const [codingMode, setCodingMode] = useState<CodingMode>(initialState.codingMode ?? 'block');
    const [language, setLanguage] = useState<string | null>(initialState.language ?? null);
    const [generator, setGenerator] = useState<string | null>(initialState.generator ?? null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [environment, setEnvironment] = useState<HardwareEnvironment | null>(initialState.environment ?? 'physical');
    const [pendingProjectIntent, setPendingProjectIntentState] = useState<PendingProjectIntent | null>(initialState.pendingProjectIntent ?? null);
    const [hasHydrated, setHasHydrated] = useState(false);

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    const config = BOARD_CONFIG[currentBoard] || BOARD_CONFIG[defaultBoard];
    const prevBoardRef = useRef<BoardKey | null>(null);

    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        if (prevBoardRef.current !== currentBoard) {
            const nextLanguage = config.language ?? null;
            const nextGenerator = config.generator ?? null;

            if (language !== nextLanguage) {
                setLanguage(nextLanguage);
            }

            if (generator !== nextGenerator) {
                setGenerator(nextGenerator);
            }

            prevBoardRef.current = currentBoard;
        }
    }, [config.generator, config.language, currentBoard, generator, hasHydrated, language]);

    useEffect(() => {
        if (!hasHydrated || typeof window === 'undefined') {
            return;
        }

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                currentBoard,
                codingMode,
                language,
                generator,
                environment,
                pendingProjectIntent,
            })
        );
    }, [currentBoard, codingMode, language, generator, environment, pendingProjectIntent, hasHydrated]);

    const setPendingProjectIntent = useCallback((intent: PendingProjectIntent | null) => {
        setPendingProjectIntentState(intent ? normalizePendingProjectIntent(intent) : null);
    }, []);

    const clearPendingProjectIntent = useCallback(() => {
        setPendingProjectIntentState(null);
    }, []);

    const value: BoardContextValue = useMemo(() => ({
        currentBoard,
        setCurrentBoard,
        codingMode,
        setCodingMode,
        language,
        setLanguage,
        generator,
        setGenerator,
        compileStrategy: config.compileStrategy,
        isFullScreen,
        setIsFullScreen,
        environment,
        setEnvironment,
        pendingProjectIntent,
        setPendingProjectIntent,
        clearPendingProjectIntent,
        hasHydrated,
    }), [currentBoard, codingMode, language, generator, config.compileStrategy, isFullScreen, environment, pendingProjectIntent, setPendingProjectIntent, clearPendingProjectIntent, hasHydrated]);

    return (
        <BoardContext.Provider value={value}>
            {children}
        </BoardContext.Provider>
    );
}

export function useBoard() {
    const context = useContext(BoardContext);
    if (context === undefined) {
        throw new Error('useBoard must be used within a BoardProvider');
    }
    return context;
}
