"use client";

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBoard } from '@/contexts/BoardContext';
import { useProject } from '@/contexts/ProjectContext';
import MainLayout from '@/components/layout/MainLayout';
import SplitView from '@/components/ide/SplitView';

function LoadingWorkspaceCard({ title, description }: { title: string; description: string }) {
    return (
        <div className="ui-foundation-shell flex h-full min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-8">
                <div className="ui-foundation-panel w-full max-w-xl px-8 py-10 text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--ui-color-primary)]/55 border-t-transparent" />
                    <h2 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[var(--ui-color-text)]">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--ui-color-text-muted)]">{description}</p>
                </div>
            </div>
        </div>
    );
}

export default function Workspace() {
    const router = useRouter();
    const { codingMode, currentBoard, environment, pendingProjectIntent, clearPendingProjectIntent, hasHydrated } = useBoard();
    const { projectId, setProjectName } = useProject();
    const initRef = useRef(false);

    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        // We bypass the old onboarding setup so that the IDE opens directly
        // using the default codingMode ('block') and environment ('physical').
    }, [hasHydrated]);

    useEffect(() => {
        if (!hasHydrated || projectId || !codingMode || !currentBoard || !environment || initRef.current) {
            return;
        }

        initRef.current = true;

        const suggestedName = pendingProjectIntent?.projectName?.trim();
        if (suggestedName) {
            setProjectName(suggestedName);
        }

        clearPendingProjectIntent();
    }, [clearPendingProjectIntent, codingMode, currentBoard, environment, hasHydrated, pendingProjectIntent, projectId, setProjectName]);

    if (!hasHydrated || ((!projectId && !codingMode) || (!projectId && !environment))) {
        return (
            <MainLayout>
                <LoadingWorkspaceCard
                    title="Taking you to the right setup step"
                    description="Checking your project, board, and environment so the workspace opens with the right context."
                />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className={environment === 'virtual' ? 'circuit-lab-page flex h-full min-h-0 flex-col' : 'ui-foundation-shell flex h-full min-h-0 flex-col'}>
                <div className="min-h-0 flex-1">
                    <SplitView />
                </div>
            </div>
        </MainLayout>
    );
}
