"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Maximize, Cpu } from 'lucide-react';
import { useBoard } from '@/contexts/BoardContext';
import { useProject } from '@/contexts/ProjectContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const isDashboard = pathname === '/dashboard';
    const isIdeRoute = pathname === '/projects/ide' || pathname.startsWith('/projects/ide/');

    const { codingMode, currentBoard, setIsFullScreen } = useBoard();
    const { projectId } = useProject();

    if (isIdeRoute) {
        return null;
    }

    return (
        <header className="flex h-14 items-center justify-between border-b border-panel-border bg-panel px-4 text-foreground backdrop-blur-xl transition-colors">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="text-lg font-bold tracking-tight text-foreground transition-colors hover:text-accent"
                >
                    Sticial Studio
                </button>

                {!isDashboard ? (
                    <span className="hidden rounded-full border border-panel-border bg-panel px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted lg:inline-flex">
                        {codingMode === 'block' ? 'Block Coding' : 'Text Coding'}
                    </span>
                ) : null}

                {!isDashboard ? (
                    <span className="hidden items-center gap-1.5 text-xs text-muted xl:inline-flex">
                        <Cpu size={13} className="text-accent" />
                        {currentBoard}
                    </span>
                ) : null}
            </div>

            <div className="flex items-center gap-2">
                {isDashboard && projectId ? (
                    <button
                        type="button"
                        onClick={() => router.push('/projects/ide')}
                        className="rounded-lg border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20"
                    >
                        Resume IDE
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                        pathname === '/dashboard'
                            ? 'border-accent/70 bg-accent/10 text-accent'
                            : 'border-panel-border bg-panel text-muted hover:border-accent/50 hover:text-foreground'
                    }`}
                >
                    <LayoutDashboard size={13} />
                    Dashboard
                </button>

                <ThemeToggle />

                {!isDashboard ? (
                    <button
                        type="button"
                        onClick={() => setIsFullScreen(true)}
                        className="rounded-lg border border-panel-border bg-panel p-2 text-muted transition-colors hover:border-accent/50 hover:text-accent"
                        title="Focus Mode"
                    >
                        <Maximize size={14} />
                    </button>
                ) : null}


            </div>
        </header>
    );
}
