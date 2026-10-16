import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { FolderOpen } from 'lucide-react';

interface SaveProjectModalProps {
  open: boolean;
  isSaving: boolean;
  newProjectName: string;
  saveLocation?: string;
  currentBoard: string;
  runtimeLabel: string;
  onNameChange: (value: string) => void;
  onLocationChange?: (value: string) => void;
  onBrowseLocation?: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function SaveProjectModal({
  open,
  isSaving,
  newProjectName,
  saveLocation,
  currentBoard,
  runtimeLabel,
  onNameChange,
  onLocationChange,
  onBrowseLocation,
  onClose,
  onSubmit,
}: SaveProjectModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/30 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            className="ui-foundation-panel w-full max-w-sm overflow-hidden rounded-[28px] p-6 sm:p-7"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
          >
            <h2 className="mb-2 text-[1.3rem] font-bold tracking-[-0.03em] text-[var(--ui-color-text)]">Save your project</h2>
            <p className="mb-5 text-sm leading-6 text-[var(--ui-color-text-muted)]">
              This scratch workspace has not been saved yet. Name it once and we will add it to your dashboard.
            </p>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-color-text-muted)]">
              <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)] px-3 py-1">
                {currentBoard}
              </span>
              <span className="rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)] px-3 py-1">
                {runtimeLabel}
              </span>
            </div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ui-color-text-muted)]">
              Project name
            </label>
            <input
              type="text"
              value={newProjectName}
              onChange={(event) => onNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isSaving && newProjectName.trim()) {
                  onSubmit();
                } else if (event.key === 'Escape' && !isSaving) {
                  onClose();
                }
              }}
              autoFocus
              className="mb-3 w-full rounded-[14px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)] px-4 py-3 text-sm font-medium text-[var(--ui-color-text)] outline-none transition-all focus:border-[color:var(--ui-color-primary)] focus:ring-2 focus:ring-[color:var(--ui-color-primary)]/20"
            />

            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ui-color-text-muted)]">
              Save location
            </label>
            <div className="mb-4 flex items-center gap-2">
              <input
                type="text"
                value={saveLocation ?? ''}
                onChange={(event) => onLocationChange?.(event.target.value)}
                placeholder="Choose folder on disk..."
                className="min-w-0 flex-1 rounded-[14px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)] px-4 py-2.5 text-xs font-medium text-[var(--ui-color-text)] outline-none transition-all focus:border-[color:var(--ui-color-primary)] focus:ring-2 focus:ring-[color:var(--ui-color-primary)]/20"
              />
              {onBrowseLocation ? (
                <button
                  type="button"
                  onClick={onBrowseLocation}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[14px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-quiet)] px-3 text-xs font-semibold text-[var(--ui-color-text)] transition-colors hover:bg-[color:var(--ui-border-soft)]"
                  title="Browse folder"
                >
                  <FolderOpen size={14} />
                  <span>Browse</span>
                </button>
              ) : null}
            </div>

            <p className="mb-6 text-xs leading-5 text-[var(--ui-color-text-muted)]">
              Tip: press Ctrl/Cmd+S any time in the editor to save or update this project.
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
              <Button onClick={onSubmit} disabled={isSaving || !newProjectName.trim()}>
                {isSaving ? 'Saving...' : 'Create & Save'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}