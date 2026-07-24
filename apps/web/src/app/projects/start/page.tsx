"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useBoard } from '@/contexts/BoardContext';
import { useProject } from '@/contexts/ProjectContext';
import { BOARD_CONFIG } from '@/lib/boards/boardConfig';

import { Suspense } from 'react';

function StartProjectInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setProjectId } = useProject();
    const { setCurrentBoard, setCodingMode, setLanguage, setGenerator, setEnvironment, setPendingProjectIntent } = useBoard();

    useEffect(() => {
        const boardParam = searchParams.get('board');
        const modeParam = searchParams.get('mode');
        const languageParam = searchParams.get('language');
        const generatorParam = searchParams.get('generator');
        const environmentParam = searchParams.get('environment');
        const projectName = searchParams.get('name');

        const board = boardParam && boardParam in BOARD_CONFIG ? boardParam : 'Arduino Uno';
        const boardConfig = BOARD_CONFIG[board];
        const mode = modeParam === 'text' ? 'text' : 'block';
        const language = languageParam || boardConfig.language;
        const generator = generatorParam || boardConfig.generator;
        const environment = environmentParam === 'physical' ? 'physical' : 'virtual';

        setProjectId(null);
        setCurrentBoard(board as any);
        setCodingMode(mode);
        setLanguage(language);
        setGenerator(generator);
        setEnvironment(environment);
        setPendingProjectIntent({ source: 'course', projectName });
        router.replace('/projects/ide');
    }, [router, searchParams, setCodingMode, setCurrentBoard, setEnvironment, setGenerator, setLanguage, setPendingProjectIntent, setProjectId]);

    return (
        <div className="flex min-h-full items-center justify-center app-canvas px-6 py-10 text-foreground">
            <div className="rounded-3xl border border-slate-700/80 bg-slate-900/70 px-8 py-10 text-center shadow-[0_24px_60px_-36px_rgba(8,47,73,0.95)]">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/60 border-t-transparent" />
                <h1 className="mt-4 text-xl font-semibold text-slate-100">Opening your lesson project</h1>
                <p className="mt-2 text-sm text-slate-400">We are loading the recommended board, coding path, and workspace for this lesson.</p>
            </div>
        </div>
    );
}

export default function StartProjectPage() {
    return (
        <MainLayout>
            <Suspense fallback={<div />}>
                <StartProjectInner />
            </Suspense>
        </MainLayout>
    );
}




