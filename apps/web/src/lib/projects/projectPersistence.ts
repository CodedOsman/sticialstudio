
import { buildProjectMetaPayload, type ProjectMeta } from "@/lib/projects/projectMeta";
import type { FileItem } from "@/stores/editorStore";

export interface PersistedProjectRecord {
  name?: string | null;
  description?: string | null;
  board?: string | null;
  codingMode?: string | null;
  language?: string | null;
  generator?: string | null;
  environment?: string | null;
  files?: FileItem[];
}

interface ProjectPayloadInput {
  projectName: string;
  files: FileItem[];
  meta: Omit<ProjectMeta, "version"> | ProjectMeta;
}

interface ProjectFileResolutionInput {
  record: PersistedProjectRecord | null | undefined;
  currentFiles: FileItem[];
  currentActiveFileId: string | null;
  language: string | null;
  generator: string | null;
}



export interface ProjectFileResolutionResult {
  projectName: string;
  projectFiles: FileItem[];
  nextActiveFileId: string | null;
  fallbackFile: FileItem | null;
}

export const ACTIVE_PROJECT_STORAGE_KEY = "activeProjectId";
export const UNTITLED_PROJECT_NAME = "Untitled Project";

function getPreferredSourceFileName(language: string | null, generator: string | null) {
  if (language === "python" || generator === "micropython") {
    return "main.py";
  }
  return "main.cpp";
}

function normalizeProjectName(projectName: string | null | undefined) {
  const trimmed = typeof projectName === "string" ? projectName.trim() : "";
  return trimmed.length > 0 ? trimmed : UNTITLED_PROJECT_NAME;
}

function buildFilePath(file: FileItem, allFiles: FileItem[]) {
  const filesById = new Map(allFiles.map((entry) => [entry.id, entry]));
  const segments = [file.name];
  let parentId = file.parentId;

  while (parentId) {
    const parent = filesById.get(parentId);
    if (!parent) break;
    segments.unshift(parent.name);
    parentId = parent.parentId;
  }

  return segments.join("/");
}

function createFallbackSourceFile(language: string | null, generator: string | null): FileItem {
  const preferredSourceFileName = getPreferredSourceFileName(language, generator);
  return {
    id: `virtual-${Date.now()}`,
    name: preferredSourceFileName,
    type: preferredSourceFileName === "main.py" ? "python" : "cpp",
    content: "",
    parentId: null,
  };
}

function resolveNextActiveFileId(
  projectFiles: FileItem[],
  currentActiveFileId: string | null,
  previousActiveFilePath: string | null,
  language: string | null,
  generator: string | null,
) {
  let nextActiveFileId = currentActiveFileId;
  if (!nextActiveFileId || !projectFiles.some((file) => file.id === nextActiveFileId && file.type !== "folder")) {
    nextActiveFileId = null;
  }

  if (!nextActiveFileId && previousActiveFilePath) {
    nextActiveFileId =
      projectFiles.find((file) => file.type !== "folder" && buildFilePath(file, projectFiles) === previousActiveFilePath)?.id ?? null;
  }

  if (!nextActiveFileId) {
    const preferredSourceFileName = getPreferredSourceFileName(language, generator);
    nextActiveFileId =
      projectFiles.find((file) => file.name === preferredSourceFileName && file.type !== "folder")?.id ??
      projectFiles.find((file) => file.type !== "folder" && file.name !== "main.blockly")?.id ??
      projectFiles.find((file) => file.type !== "folder")?.id ??
      null;
  }

  return nextActiveFileId;
}

export function getStoredActiveProjectId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
}

export function persistActiveProjectId(projectId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (projectId) {
    window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
  } else {
    window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
  }
}



export function buildProjectPayload({ projectName, files, meta }: ProjectPayloadInput) {
  return {
    name: normalizeProjectName(projectName),
    files,
    ...buildProjectMetaPayload(meta),
  };
}

export function resolveProjectFilesState({
  record,
  currentFiles,
  currentActiveFileId,
  language,
  generator,
}: ProjectFileResolutionInput): ProjectFileResolutionResult {
  const previousActiveFile = currentActiveFileId
    ? currentFiles.find((file) => file.id === currentActiveFileId && file.type !== "folder") ?? null
    : null;
  const previousActiveFilePath = previousActiveFile ? buildFilePath(previousActiveFile, currentFiles) : null;
  const projectFiles = Array.isArray(record?.files) ? record.files : [];

  if (projectFiles.length === 0) {
    const fallbackFile = createFallbackSourceFile(language, generator);
    return {
      projectName: normalizeProjectName(record?.name),
      projectFiles,
      nextActiveFileId: fallbackFile.id,
      fallbackFile,
    };
  }

  return {
    projectName: normalizeProjectName(record?.name),
    projectFiles,
    nextActiveFileId: resolveNextActiveFileId(projectFiles, currentActiveFileId, previousActiveFilePath, language, generator),
    fallbackFile: null,
  };
}
