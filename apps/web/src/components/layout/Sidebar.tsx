'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FolderKanban } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    const itemClass = (path: string) =>
        pathname === path
            ? 'border-accent/70 bg-accent/10 text-accent'
            : 'border-transparent text-muted hover:border-panel-border hover:bg-panel hover:text-foreground';

    return (
        <aside className="flex h-full w-64 shrink-0 flex-col border-r border-panel-border bg-panel backdrop-blur-xl transition-colors">
            <div className="border-b border-panel-border px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">STEMAIDE IDE</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">Learning Workspace</h2>
            </div>

            <nav className="flex-1 space-y-6 px-3 py-4">
                <div>
                    <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Learning</p>
                    <div className="space-y-1.5">
                        <Link href="/courses" className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${itemClass('/courses')}`}>
                            <BookOpen size={16} />
                            Study Course
                        </Link>
                        <Link href="/" className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${itemClass('/')}`}>
                            <FolderKanban size={16} />
                            Build Project
                        </Link>
                    </div>
                </div>
            </nav>
        </aside>
    );
}
