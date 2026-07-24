"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Library, Download, CheckCircle2, Info, AlertCircle, Loader2, RefreshCw, Trash2, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useBoard } from '@/contexts/BoardContext';
import { apiFetch, safeJson } from '@/lib/api';

interface LibraryItem {
  name: string;
  author: string;
  version: string;
  latestVersion?: string | null;
  description: string;
  category?: string;
  website?: string | null;
  includes?: string[];
  availableVersions?: string[];
  installed: boolean;
  installedVersion?: string | null;
}

interface LibraryResponse {
  success?: boolean;
  libraries?: LibraryItem[];
  warnings?: string[];
  error?: string;
}

const MICROPYTHON_PREVIEW_PACKAGES: LibraryItem[] = [
  {
    name: 'umqtt.simple',
    author: 'MicroPython',
    version: 'Preview',
    description: 'Lightweight MQTT client commonly used in connected MicroPython projects.',
    category: 'Networking',
    includes: ['umqtt/simple.py'],
    installed: false,
  },
  {
    name: 'ssd1306',
    author: 'Adafruit community',
    version: 'Preview',
    description: 'OLED display driver module often copied into /lib on MicroPython boards.',
    category: 'Display',
    includes: ['ssd1306.py'],
    installed: false,
  },
  {
    name: 'neopixel',
    author: 'MicroPython runtime',
    version: 'Built-in',
    description: 'Built-in LED strip support that ships with many MicroPython firmware images.',
    category: 'Device Control',
    includes: ['neopixel'],
    installed: true,
    installedVersion: 'Built-in',
  },
];

function summarizeIncludes(library: LibraryItem) {
  if (!Array.isArray(library.includes) || library.includes.length === 0) {
    return 'No headers listed';
  }

  return library.includes.slice(0, 3).join(', ');
}

export default function LibraryHub() {
  const { language } = useBoard();
  const token = 'local';
  const isPython = language === 'python';
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [libraries, setLibraries] = useState<LibraryItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyLibraryName, setBusyLibraryName] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'install' | 'uninstall' | null>(null);

  const trimmedQuery = query.trim();
  const isSearchMode = trimmedQuery.length >= 2;

  const loadArduinoLibraries = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    if (!token) {
      setLibraries([]);
      setWarnings([]);
      setError('Your session ended. Sign in again to load Arduino libraries.');
      setLoading(false);
      return;
    }

    try {
      const suffix = searchQuery
        ? `/api/libraries/arduino/search?q=${encodeURIComponent(searchQuery)}`
        : '/api/libraries/arduino/installed';
      const res = await apiFetch(suffix, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson<LibraryResponse>(res);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Library API error (status ${res.status}).`);
      }

      setLibraries(Array.isArray(data.libraries) ? data.libraries : []);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    } catch (fetchError) {
      setLibraries([]);
      setWarnings([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load Arduino libraries.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isPython) {
      setLibraries(MICROPYTHON_PREVIEW_PACKAGES);
      setWarnings([]);
      setError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadArduinoLibraries(isSearchMode ? trimmedQuery : '');
    }, isSearchMode ? 220 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [isPython, isSearchMode, loadArduinoLibraries, trimmedQuery]);

  const refresh = useCallback(() => {
    setStatusMessage(null);
    if (isPython) {
      setLibraries(MICROPYTHON_PREVIEW_PACKAGES);
      return;
    }

    void loadArduinoLibraries(isSearchMode ? trimmedQuery : '');
  }, [isPython, isSearchMode, loadArduinoLibraries, trimmedQuery]);

  const mutateArduinoLibrary = useCallback(
    async (library: LibraryItem, action: 'install' | 'uninstall') => {
      setBusyLibraryName(library.name);
      setBusyAction(action);
      setError(null);
      setStatusMessage(null);

      if (!token) {
        setError('Your session ended. Sign in again to change Arduino libraries.');
        setBusyLibraryName(null);
        setBusyAction(null);
        return;
      }

      try {
        const endpoint = action === 'install' ? '/api/libraries/arduino/install' : '/api/libraries/arduino/uninstall';
        const body = action === 'install'
          ? { name: library.name, version: library.version }
          : { name: library.name };
        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const data = await safeJson<LibraryResponse>(res);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `Library action failed (status ${res.status}).`);
        }

        setLibraries(Array.isArray(data.libraries) ? data.libraries : []);
        setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
        setStatusMessage(action === 'install' ? `${library.name} installed.` : `${library.name} removed.`);

        if (trimmedQuery.length >= 2) {
          await loadArduinoLibraries(trimmedQuery);
        }
      } catch (mutationError) {
        setError(mutationError instanceof Error ? mutationError.message : 'Library action failed.');
      } finally {
        setBusyLibraryName(null);
        setBusyAction(null);
      }
    },
    [loadArduinoLibraries, token, trimmedQuery]
  );

  const emptyState = useMemo(() => {
    if (isPython) {
      return {
        title: 'MicroPython package installer is next',
        description: 'This rail now anchors the shared dependency workflow, but on-device /lib installs and package search still need to be built.',
      };
    }

    if (trimmedQuery.length === 1) {
      return {
        title: 'Keep typing to search the registry',
        description: 'Search starts after 2 characters so the Arduino registry stays fast and relevant.',
      };
    }

    return {
      title: 'No libraries matched',
      description: isSearchMode
        ? 'Try a broader term like servo, display, wifi, or motor.'
        : 'Installed libraries on this machine will appear here.',
    };
  }, [isPython, isSearchMode, trimmedQuery.length]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="border-b border-[color:var(--ui-border-soft)] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ui-color-text-soft)]">
              <Library size={13} className="text-[var(--ui-color-primary)]" />
              {isPython ? 'MicroPython Packages' : 'Arduino Libraries'}
            </div>
            <p className="mt-2 text-sm text-[var(--ui-color-text-muted)]">
              {isPython
                ? 'Package installs are planned next for on-device /lib sync and curated modules.'
                : isSearchMode
                  ? 'Searching the Arduino library registry.'
                  : 'Showing libraries already installed on this machine.'}
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        <div className="relative mt-4">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-color-text-soft)]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isPython ? 'Preview package names' : 'Search Arduino libraries'}
            className="h-11 w-full rounded-[16px] border border-[color:var(--ui-border-soft)] ui-input-surface pl-10 pr-4 text-sm outline-none transition-all focus:border-[color:var(--ui-color-primary)]/50 focus:ring-1 focus:ring-[color:var(--ui-color-primary)]/10"
          />
        </div>

        {statusMessage ? (
          <div className="mt-3 rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            {statusMessage}
          </div>
        ) : null}
        {error ? (
          <div className="mt-3 rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </div>
        ) : null}
        {warnings.length > 0 ? (
          <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {warnings[0]}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {loading ? (
          <div className="flex h-32 flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--ui-color-primary)]/60" />
            <span className="text-xs font-medium text-[var(--ui-color-text-muted)]">Loading libraries...</span>
          </div>
        ) : libraries.length === 0 ? (
          <div className="mx-3 mt-4 rounded-[22px] ui-quiet-surface border-dashed px-4 py-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-6 w-6 text-[var(--ui-color-text-soft)]" />
            <p className="text-sm font-medium text-[var(--ui-color-text)]">{emptyState.title}</p>
            <p className="mt-1 text-xs text-[var(--ui-color-text-soft)]">{emptyState.description}</p>
          </div>
        ) : (
          <div className="space-y-1.5 px-2">
            <AnimatePresence mode="popLayout">
              {libraries.map((library) => {
                const isBusy = busyLibraryName === library.name;
                const actionLabel = busyAction === 'uninstall' ? 'Removing' : 'Installing';

                return (
                  <motion.div
                    key={library.name}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative rounded-[20px] ui-elevated-surface p-3 transition-all hover:bg-[color:var(--ui-color-surface)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate text-sm font-bold text-[var(--ui-color-text)]">{library.name}</h4>
                          {library.installed ? <CheckCircle2 size={13} className="shrink-0 text-emerald-500" /> : null}
                        </div>
                        <p className="truncate text-[11px] text-[var(--ui-color-text-soft)]">
                          by {library.author} | v{library.installedVersion || library.version}
                        </p>
                      </div>

                      {isPython ? (
                        <div className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-elevated)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ui-color-text-soft)]">
                          {library.installed ? 'Built-in' : 'Planned'}
                        </div>
                      ) : isBusy ? (
                        <div className="flex items-center gap-1 rounded-full bg-[var(--ui-color-primary)]/10 px-2 py-1 text-[10px] font-bold text-[var(--ui-color-primary)]">
                          <Loader2 size={11} className="animate-spin" />
                          {actionLabel}
                        </div>
                      ) : library.installed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={13} />}
                          onClick={() => void mutateArduinoLibrary(library, 'uninstall')}
                          className="min-h-8 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Download size={13} />}
                          onClick={() => void mutateArduinoLibrary(library, 'install')}
                          className="min-h-8 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
                        >
                          Install
                        </Button>
                      )}
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--ui-color-text-muted)]">
                      {library.description || 'No description available yet.'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-color-text-soft)]">
                      <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)] px-2 py-1">
                        {library.category || 'General'}
                      </span>
                      <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)] px-2 py-1">
                        <Box size={11} className="mr-1 inline-block" />
                        {summarizeIncludes(library)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[color:var(--ui-border-soft)]/40 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={library.website || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                          library.website
                            ? 'text-[var(--ui-color-text-soft)] hover:text-[var(--ui-color-primary)]'
                            : 'pointer-events-none text-[var(--ui-color-text-soft)]/60'
                        }`}
                      >
                        <Info size={11} />
                        Documentation
                      </a>
                      {library.availableVersions && library.availableVersions.length > 1 ? (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-color-text-soft)]">
                          {library.availableVersions.length} versions
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="bg-[color:var(--ui-color-text)]/5 px-4 py-3 text-[10px] leading-relaxed text-[var(--ui-color-text-muted)]">
        {isPython
          ? 'Next step for MicroPython: install modules to /lib on the board and sync project helper files so text mode behaves more like Thonny.'
          : 'Arduino libraries now reflect the local arduino-cli environment, so installs here are meant to match the same toolchain the compiler uses.'}
      </div>
    </div>
  );
}
