"use client";

import React, { useCallback, useMemo, useState } from 'react';
import {
  Activity,
  Aperture,
  Archive,
  ArrowRightToLine,
  Blocks,
  GitBranch,
  Infinity as InfinityIcon,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Repeat,
  Search,
  Settings,
  SquareFunction,
  Type,
} from 'lucide-react';

export const BLOCK_CATEGORIES = [
  {
    id: 'Input/Output',
    label: 'Input/Output',
    description: 'Pins, reads, writes, and sound',
    icon: <ArrowRightToLine size={16} strokeWidth={2.3} />,
    color: '#d5607c',
  },
  {
    id: 'Sensors',
    label: 'Sensors',
    description: 'Read live parts and values',
    icon: <Activity size={16} strokeWidth={2.3} />,
    color: '#c0488a',
  },
  {
    id: 'Motion',
    label: 'Motion',
    description: 'Servos and moving outputs',
    icon: <Settings size={16} strokeWidth={2.3} />,
    color: '#d35b73',
  },
  {
    id: 'Control',
    label: 'Control',
    description: 'Start points, timing, and flow',
    icon: <LayoutGrid size={16} strokeWidth={2.3} />,
    color: '#6382f9',
  },
  {
    id: 'Logic',
    label: 'Logic',
    description: 'If, compare, and decide',
    icon: <GitBranch size={16} strokeWidth={2.3} />,
    color: '#744ffc',
  },
  {
    id: 'Loops',
    label: 'Loops',
    description: 'Repeat actions and patterns',
    icon: <Repeat size={16} strokeWidth={2.3} />,
    color: '#5aa9f7',
  },
  {
    id: 'Math',
    label: 'Math',
    description: 'Numbers, ranges, and formulas',
    icon: <InfinityIcon size={16} strokeWidth={2.3} />,
    color: '#54b274',
  },
  {
    id: 'Text',
    label: 'Text',
    description: 'Words and serial output',
    icon: <Type size={16} strokeWidth={2.3} />,
    color: '#7caf55',
  },
  {
    id: 'Variables',
    label: 'Variables',
    description: 'Store values for later',
    icon: <Archive size={16} strokeWidth={2.3} />,
    color: '#df8b2d',
  },
  {
    id: 'Functions',
    label: 'Functions',
    description: 'Build reusable actions',
    icon: <SquareFunction size={16} strokeWidth={2.3} />,
    color: '#efb936',
  },
  {
    id: 'Messaging',
    label: 'Messaging',
    description: 'Events and communication',
    icon: <MessageSquare size={16} strokeWidth={2.3} />,
    color: '#d86b43',
  },
  {
    id: 'Color',
    label: 'Color',
    description: 'RGB and light choices',
    icon: <Aperture size={16} strokeWidth={2.3} />,
    color: '#9f41de',
  },
  {
    id: 'Displays',
    label: 'Displays',
    description: 'OLED and output helpers',
    icon: <Monitor size={16} strokeWidth={2.3} />,
    color: '#5e31a6',
  },
  {
    id: 'More Blocks',
    label: 'More Blocks',
    description: 'Extra project-specific blocks',
    icon: <Blocks size={16} strokeWidth={2.3} />,
    color: '#111111',
  },
] as const;

export type BlockCategoryId = (typeof BLOCK_CATEGORIES)[number]["id"];

interface WorkspaceSidebarProps {
  codingMode: 'block' | 'text' | string;
  selectedBlocklyCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function WorkspaceSidebar({
  codingMode,
  selectedBlocklyCategory,
  onSelectCategory,
}: WorkspaceSidebarProps) {
  const [query, setQuery] = useState('');

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      onSelectCategory(categoryId);
    },
    [onSelectCategory]
  );

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return BLOCK_CATEGORIES;
    }

    return BLOCK_CATEGORIES.filter(
      (category) =>
        category.label.toLowerCase().includes(normalized) ||
        category.description.toLowerCase().includes(normalized)
    );
  }, [query]);

  if (codingMode !== 'block') {
    return null;
  }

  return (
    <section className='flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#10131f_0%,#090c16_100%)] p-5 shadow-[0_28px_70px_-48px_rgba(0,0,0,1)]'>
      <div className='space-y-4 border-b border-white/8 pb-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ui-color-text)]'>Blocks</p>
            <h3 className='mt-2 text-[1.25rem] font-bold tracking-[-0.04em] text-[color:var(--ui-color-text)]'>Choose one family</h3>
            <p className='mt-2 text-sm leading-6 text-[color:var(--ui-color-text)]'>Pick a category, then drag blocks into the stage.</p>
          </div>
          <div className='rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ui-color-text)]'>
            {filteredCategories.length}
          </div>
        </div>

        <label className='flex h-11 items-center gap-3 rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 text-[color:var(--ui-color-text)] transition-colors focus-within:border-[color:var(--ui-border-strong)] focus-within:text-[color:var(--ui-color-text)]'>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search block families'
            className='w-full bg-transparent text-sm text-[color:var(--ui-color-text)] outline-none placeholder:text-[color:var(--ui-color-text)]'
          />
        </label>
      </div>

      <div className='custom-scrollbar min-h-0 flex-1 overflow-y-auto py-4'>
        <div className='space-y-2.5'>
          {filteredCategories.map((category) => {
            const isActive = selectedBlocklyCategory === category.id;

            return (
              <button
                key={category.id}
                type='button'
                aria-label={category.id}
                aria-pressed={isActive}
                onClick={() => handleSelectCategory(category.id)}
                className={`group flex w-full items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition-all duration-150 ${
                  isActive
                    ? 'border-indigo-300/24 bg-white/[0.08] shadow-[0_20px_40px_-28px_rgba(101,108,248,0.55)]'
                    : 'border-white/8 bg-[color:var(--ui-color-surface)] hover:-translate-y-0.5 hover:border-white/12 hover:bg-white/[0.06]'
                }`}
              >
                <span
                  className='mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-[color:var(--ui-color-text)] shadow-[0_18px_36px_-24px_rgba(15,23,42,0.5)]'
                  style={{ backgroundColor: category.color }}
                >
                  {category.icon}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='flex items-center gap-2'>
                    <span className='block text-sm font-semibold text-[color:var(--ui-color-text)]'>{category.label}</span>
                    {isActive ? (
                      <span className='rounded-full border border-indigo-300/24 bg-indigo-300/12 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-200'>
                        Active
                      </span>
                    ) : null}
                  </span>
                  <span className='mt-1 block text-sm leading-6 text-[color:var(--ui-color-text)]'>{category.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {filteredCategories.length === 0 ? (
          <div className='mt-4 rounded-[22px] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-4 py-5 text-sm text-[color:var(--ui-color-text)]'>
            No block families match &quot;{query}&quot;.
          </div>
        ) : null}
      </div>

      <div className='border-t border-white/8 pt-4'>
        <div className='rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-4 py-4'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ui-color-text)]'>Selected</p>
          <p className='mt-2 text-base font-semibold text-[color:var(--ui-color-text)]'>{selectedBlocklyCategory}</p>
        </div>
      </div>
    </section>
  );
}
