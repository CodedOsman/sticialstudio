"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Library, Download, CheckCircle2, Info, AlertCircle, Loader2, RefreshCw, Trash2, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useBoard } from '@/contexts/BoardContext';
import { apiFetch, safeJson } from '@/lib/api';
import type { useWebSerial } from '@/hooks/useWebSerial';

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
  mockSource?: string;
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
    includes: ['umqtt_simple.py'],
    installed: false,
    mockSource: `class MQTTClient:
    def __init__(self, client_id, server, port=0, user=None, password=None, keepalive=0, ssl=False, ssl_params={}):
        self.client_id = client_id
        self.server = server
        self.port = port
        self.user = user
        self.password = password
        self.keepalive = keepalive
        self.ssl = ssl
        self.ssl_params = ssl_params
    def connect(self, clean_session=True):
        pass
    def publish(self, topic, msg, retain=False, qos=0):
        pass
`
  },
  {
    name: 'ssd1306',
    author: 'Adafruit community',
    version: 'Preview',
    description: 'OLED display driver module often copied into /lib on MicroPython boards.',
    category: 'Display',
    includes: ['ssd1306.py'],
    installed: false,
    mockSource: `# MicroPython SSD1306 OLED driver, I2C and SPI interfaces
import time
import framebuf

class SSD1306(framebuf.FrameBuffer):
    def __init__(self, width, height, external_vcc):
        self.width = width
        self.height = height
        self.external_vcc = external_vcc
        self.pages = self.height // 8
        self.buffer = bytearray(self.pages * self.width)
        super().__init__(self.buffer, self.width, self.height, framebuf.MONO_VLSB)
        self.init_display()

    def init_display(self):
        pass
    def poweroff(self):
        pass
    def poweron(self):
        pass
    def contrast(self, contrast):
        pass
    def invert(self, invert):
        pass
    def show(self):
        pass
`
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

const ARDUINO_MOCK_LIBRARIES: LibraryItem[] = [
  {
    name: 'Servo',
    author: 'Michael Margolis, Arduino',
    version: '1.1.8',
    description: 'Allows Arduino boards to control a variety of servo motors.',
    category: 'Device Control',
    includes: ['Servo.h'],
    installed: true,
    installedVersion: '1.1.8',
  },
  {
    name: 'Wire',
    author: 'Arduino',
    version: '1.0.0',
    description: 'Allows communication with I2C / TWI devices.',
    category: 'Communication',
    includes: ['Wire.h'],
    installed: true,
    installedVersion: '1.0.0',
  },
  {
    name: 'Adafruit NeoPixel',
    author: 'Adafruit',
    version: '1.10.5',
    description: 'Arduino library for controlling single-wire LED pixels (NeoPixel, WS2812, etc.)',
    category: 'Display',
    includes: ['Adafruit_NeoPixel.h'],
    installed: false,
    availableVersions: ['1.10.5', '1.10.4'],
  }
];

function summarizeIncludes(library: LibraryItem) {
  if (!Array.isArray(library.includes) || library.includes.length === 0) {
    return 'No headers listed';
  }

  return library.includes.slice(0, 3).join(', ');
}

export default function LibraryHub({ webSerial }: { webSerial?: ReturnType<typeof useWebSerial> }) {
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
      // Check if we are running in Tauri
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        
        let results: LibraryItem[] = [];
        
        if (searchQuery) {
          const jsonStr = await invoke<string>('manage_arduino_library', {
            action: 'search',
            libraryName: searchQuery
          });
          const data = JSON.parse(jsonStr);
          
          if (data.libraries && Array.isArray(data.libraries)) {
            results = data.libraries.map((lib: any) => {
              const latest = lib.latest || {};
              return {
                name: lib.name || 'Unknown',
                author: latest.author || 'Unknown',
                version: latest.version || 'Unknown',
                latestVersion: latest.version,
                description: latest.sentence || latest.paragraph || 'No description',
                category: latest.category,
                website: latest.website,
                includes: latest.provides_includes || [],
                availableVersions: lib.available_versions || [],
                installed: false, // We'd need to cross-reference with 'list' to know if it's installed, assuming false for search results
              };
            });
          }
        } else {
          const jsonStr = await invoke<string>('manage_arduino_library', {
            action: 'list',
            libraryName: ''
          });
          const data = JSON.parse(jsonStr);
          
          if (data.installed_libraries && Array.isArray(data.installed_libraries)) {
            results = data.installed_libraries.map((item: any) => {
              const lib = item.library || {};
              return {
                name: lib.name || 'Unknown',
                author: lib.author || 'Unknown',
                version: lib.version || 'Unknown',
                latestVersion: lib.version,
                description: lib.sentence || lib.paragraph || 'No description',
                category: lib.category,
                website: lib.website,
                includes: lib.provides_includes || [],
                availableVersions: [lib.version],
                installed: true,
                installedVersion: lib.version
              };
            });
          }
        }
        
        setLibraries(results);
      } else {
        // Fallback to mock data for browser environment
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let results = ARDUINO_MOCK_LIBRARIES;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          results = results.filter(lib => 
            lib.name.toLowerCase().includes(q) || 
            lib.description.toLowerCase().includes(q)
          );
        } else {
          results = results.filter(lib => lib.installed);
        }
        
        setLibraries(results);
      }
      setWarnings([]);
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

  const mutateMicroPythonLibrary = useCallback(
    async (library: LibraryItem, action: 'install' | 'uninstall') => {
      setBusyLibraryName(library.name);
      setBusyAction(action);
      setError(null);
      setStatusMessage(null);

      if (!webSerial) {
        setError('Serial capability not found.');
        setBusyLibraryName(null);
        setBusyAction(null);
        return;
      }
      
      // Checking webSerial isConnected property through object destructuring
      const { isConnected, runMicroPythonCommand } = webSerial;

      if (!isConnected) {
        setError('Board not connected. Please connect your MicroPython board to install libraries.');
        setBusyLibraryName(null);
        setBusyAction(null);
        return;
      }

      try {
        if (action === 'install') {
          if (!library.mockSource) {
             throw new Error('No source code available for this preview package.');
          }
          const filename = library.includes?.[0] || `${library.name}.py`;
          const escapedSource = library.mockSource.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          
          const script = `
try:
  import os
  try: os.mkdir('lib')
  except: pass
  with open('lib/${filename}', 'w') as f:
    f.write('''${escapedSource}''')
  print("OK")
except Exception as e:
  print("ERROR:", e)
`;
          const out = await runMicroPythonCommand(script);
          if (out.includes('ERROR:')) {
            throw new Error(out.split('ERROR:')[1].trim());
          }
        } else {
          const filename = library.includes?.[0] || `${library.name}.py`;
          const script = `
try:
  import os
  os.remove('lib/${filename}')
  print("OK")
except Exception as e:
  print("ERROR:", e)
`;
          const out = await runMicroPythonCommand(script);
          if (out.includes('ERROR:') && !out.includes('ENOENT')) { // ignore not found
            throw new Error(out.split('ERROR:')[1].trim());
          }
        }

        setStatusMessage(action === 'install' ? 'Installation complete on device.' : 'Library removed from device.');
        
        // Update local state
        setLibraries(prev => prev.map(lib => {
          if (lib.name === library.name) {
            return {
              ...lib,
              installed: action === 'install',
            };
          }
          return lib;
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Library action failed.');
      } finally {
        setBusyLibraryName(null);
        setBusyAction(null);
      }
    },
    [webSerial]
  );

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
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          
          await invoke('manage_arduino_library', {
            action: action,
            libraryName: action === 'install' && library.availableVersions?.[0] 
              ? `${library.name}@${library.availableVersions[0]}` 
              : library.name
          });
          
          setStatusMessage(action === 'install' ? 'Installation complete.' : 'Library removed.');
          
          // Re-fetch the current list to reflect actual status
          if (trimmedQuery.length >= 2) {
            await loadArduinoLibraries(trimmedQuery);
          } else {
            await loadArduinoLibraries('');
          }
        } else {
          // Mock installation latency
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setStatusMessage(action === 'install' ? 'Installation complete.' : 'Library removed.');
          
          // Update mock data locally for immediate feedback
          setLibraries(prev => prev.map(lib => {
            if (lib.name === library.name) {
              return {
                ...lib,
                installed: action === 'install',
                installedVersion: action === 'install' ? (lib.availableVersions?.[0] || lib.version) : null
              };
            }
            return lib;
          }));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Library action failed.');
      } finally {
        setBusyLibraryName(null);
        setBusyAction(null);
      }
    },
    [loadArduinoLibraries, token, trimmedQuery]
  );

  const emptyState = useMemo(() => {
    if (trimmedQuery.length === 1) {
      return {
        title: 'Keep typing to search the registry',
        description: 'Search starts after 2 characters so the registry stays fast and relevant.',
      };
    }

    return {
      title: 'No libraries matched',
      description: isSearchMode
        ? `We couldn't find anything for "${trimmedQuery}".`
        : 'Your library collection is empty.',
    };
  }, [trimmedQuery, isSearchMode]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] px-3 py-2">
        <div className="relative flex-1">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ui-color-text-soft)]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isPython ? 'Search packages...' : 'Search libraries...'}
            className="h-7 w-full rounded-md border border-[color:var(--ui-border-soft)] bg-transparent pl-8 pr-3 text-xs outline-none transition-all focus:border-[color:var(--ui-color-primary)]/50 focus:ring-1 focus:ring-[color:var(--ui-color-primary)]/10"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
          onClick={refresh}
          disabled={loading}
          className="h-7 w-7 p-0 text-[var(--ui-color-text-soft)] hover:text-[var(--ui-color-text)]"
          title="Refresh"
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
                    className="group relative border-b border-[color:var(--ui-border-soft)] p-3 transition-colors hover:bg-[color:var(--ui-color-surface-hover)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate text-sm font-medium text-[var(--ui-color-text)]">{library.name}</h4>
                          {library.installed ? <CheckCircle2 size={13} className="shrink-0 text-emerald-500" /> : null}
                        </div>
                        <p className="truncate text-[11px] text-[var(--ui-color-text-soft)]">
                          {library.author} â€¢ v{library.installedVersion || library.version}
                        </p>
                      </div>

                      {isBusy ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--ui-color-primary)]">
                          <Loader2 size={11} className="animate-spin" />
                          {actionLabel}
                        </div>
                      ) : library.installed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={13} />}
                          onClick={() => {
                            if (isPython) {
                               if (library.version !== 'Built-in') {
                                 void mutateMicroPythonLibrary(library, 'uninstall');
                               }
                            } else {
                               void mutateArduinoLibrary(library, 'uninstall');
                            }
                          }}
                          className="h-6 w-6 p-0 text-[var(--ui-color-text-soft)] opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                          title="Remove library"
                          disabled={isPython && library.version === 'Built-in'}
                        />
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Download size={12} />}
                          onClick={() => {
                            if (isPython) {
                               void mutateMicroPythonLibrary(library, 'install');
                            } else {
                               void mutateArduinoLibrary(library, 'install');
                            }
                          }}
                          className="h-6 gap-1 rounded bg-[color:var(--ui-color-primary)] px-2 py-0 text-[11px] font-medium text-white opacity-0 shadow-sm transition-all hover:brightness-110 group-hover:opacity-100"
                        >
                          Install
                        </Button>
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--ui-color-text-muted)]">
                      {library.description || 'No description available yet.'}
                    </p>

                    <div className="mt-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--ui-color-text-soft)]">
                        <span>{library.category || 'General'}</span>
                        <span>â€¢</span>
                        <span className="flex items-center">
                          <Box size={10} className="mr-1 inline-block" />
                          {summarizeIncludes(library)}
                        </span>
                      </div>

                      <a
                        href={library.website || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-1 text-[10px] ${
                          library.website
                            ? 'text-[var(--ui-color-text-soft)] hover:text-[var(--ui-color-primary)] hover:underline'
                            : 'pointer-events-none text-transparent'
                        }`}
                      >
                        <Info size={10} />
                        Docs
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>


    </div>
  );
}
