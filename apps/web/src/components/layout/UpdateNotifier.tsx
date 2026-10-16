'use client';

import React, { useEffect, useState } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Download, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button'; 

export function UpdateNotifier() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only run in Tauri environment when update server is configured and active
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;
    if (process.env.NEXT_PUBLIC_ENABLE_UPDATER !== 'true') return;

    const checkForUpdates = async () => {
      try {
        const availableUpdate = await check();
        if (availableUpdate) {
          setUpdate(availableUpdate);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    // Check immediately on mount, and then every 24 hours
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 1000 * 60 * 60 * 24);
    
    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    if (!update) return;

    setIsDownloading(true);
    let downloadedBytes = 0;
    let totalBytes = 0;

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalBytes = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloadedBytes += event.data.chunkLength;
            if (totalBytes) {
              setDownloadProgress(Math.round((downloadedBytes / totalBytes) * 100));
            }
            break;
          case 'Finished':
            setIsDownloaded(true);
            setIsDownloading(false);
            break;
        }
      });

      setIsDownloaded(true);
      setIsDownloading(false);
    } catch (error) {
      console.error('Failed to install update:', error);
      setIsDownloading(false);
    }
  };

  const handleRestart = async () => {
    await relaunch();
  };

  if (!update || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 overflow-hidden rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface)] shadow-lg">
      <div className="flex items-center justify-between border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-color-surface-hover)] px-4 py-2">
        <h3 className="text-sm font-semibold text-[color:var(--ui-color-text)]">Update Available</h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-[color:var(--ui-color-text-soft)] hover:text-[color:var(--ui-color-text)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4">
        <p className="text-xs text-[color:var(--ui-color-text-soft)]">
          Version <span className="font-medium text-[color:var(--ui-color-text)]">{update.version}</span> is available.
        </p>

        {update.body && (
          <div className="mt-2 max-h-24 overflow-y-auto rounded bg-black/5 p-2 text-xs text-[color:var(--ui-color-text-muted)] dark:bg-white/5">
            {update.body}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          {isDownloaded ? (
            <Button onClick={handleRestart} className="w-full justify-center" size="sm" variant="primary">
              <RefreshCw size={14} className="mr-2" />
              Restart to Update
            </Button>
          ) : isDownloading ? (
            <div className="flex w-full flex-col gap-1">
              <div className="flex justify-between text-[10px] text-[color:var(--ui-color-text-soft)]">
                <span>Downloading...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--ui-border-soft)]">
                <div
                  className="h-full bg-[color:var(--ui-color-primary)] transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <Button onClick={handleInstall} className="w-full justify-center" size="sm" variant="primary">
              <Download size={14} className="mr-2" />
              Download & Install
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
