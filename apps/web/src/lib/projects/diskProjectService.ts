import type { FileItem } from "@/stores/editorStore";

export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pickProjectFolder(defaultPath?: string): Promise<string | null> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const selected = await invoke<string | null>("pick_folder", {
        defaultPath: defaultPath || null,
      });
      return selected || null;
    } catch (err) {
      console.warn("pick_folder invoke failed:", err);
    }
  }
  return null;
}

export async function getDefaultProjectsDirectory(): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const dir = await invoke<string>("get_default_projects_dir");
      if (dir) return dir;
    } catch (err) {
      console.warn("get_default_projects_dir invoke failed:", err);
    }
  }
  return "STEMAIDE Projects";
}

export async function saveProjectFilesToDisk(
  folderPath: string,
  projectName: string,
  files: FileItem[],
): Promise<string | null> {
  if (isTauriEnvironment() && folderPath) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const savedPath = await invoke<string>("save_project_to_disk", {
        payload: {
          folderPath,
          projectName,
          files: files.map((f) => ({
            path: f.name,
            content: f.content,
          })),
        },
      });
      return savedPath;
    } catch (err) {
      console.error("save_project_to_disk invoke failed:", err);
    }
  }
  return null;
}
