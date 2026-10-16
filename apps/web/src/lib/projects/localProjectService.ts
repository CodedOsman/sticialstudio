import type { FileItem } from "@/stores/editorStore";
import { UNTITLED_PROJECT_NAME, type PersistedProjectRecord } from "./projectPersistence";

export interface LocalProject {
  id: string;
  name: string;
  location?: string | null;
  description?: string | null;
  files: FileItem[];
  createdAt: string;
  updatedAt: string;
  board?: string;
  mode?: string;
  language?: string;
  generator?: string;
  environment?: string;
}

const STORAGE_KEY = "stemaide:local-projects";

function getStore(): Record<string, LocalProject> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, LocalProject>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("Failed to save local projects store:", err);
  }
}

export function getLocalProjects(): LocalProject[] {
  const store = getStore();
  return Object.values(store).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getLocalProject(id: string): LocalProject | null {
  const store = getStore();
  return store[id] || null;
}

export function saveLocalProject(input: {
  id?: string | null;
  name: string;
  location?: string | null;
  files: FileItem[];
  meta?: {
    board?: string | null;
    mode?: string | null;
    language?: string | null;
    generator?: string | null;
    environment?: string | null;
  };
}): LocalProject {
  const store = getStore();
  const id = input.id && input.id.trim() ? input.id.trim() : `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const existing = store[id];

  const trimmedName = input.name.trim() || UNTITLED_PROJECT_NAME;

  const project: LocalProject = {
    id,
    name: trimmedName,
    location: input.location !== undefined ? input.location : (existing?.location ?? null),
    description: existing?.description || `Project ${trimmedName}`,
    files: input.files,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    board: input.meta?.board || existing?.board || "arduino:avr:uno",
    mode: input.meta?.mode || existing?.mode || "block",
    language: input.meta?.language || existing?.language || "cpp",
    generator: input.meta?.generator || existing?.generator || "arduino",
    environment: input.meta?.environment || existing?.environment || "physical",
  };

  store[id] = project;
  saveStore(store);
  return project;
}

export function deleteLocalProject(id: string): boolean {
  const store = getStore();
  if (store[id]) {
    delete store[id];
    saveStore(store);
    return true;
  }
  return false;
}

export function updateLocalProjectName(id: string, newName: string): boolean {
  const store = getStore();
  if (store[id]) {
    store[id].name = newName.trim() || UNTITLED_PROJECT_NAME;
    store[id].updatedAt = new Date().toISOString();
    saveStore(store);
    return true;
  }
  return false;
}
