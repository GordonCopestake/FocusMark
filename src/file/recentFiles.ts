const MAX_RECENT_FILES = 10;

type RecentFile = {
  path: string;
  name: string;
  accessedAt: number;
};

function loadRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem("focusmark_recent_files");
    if (!raw) return [];
    return JSON.parse(raw) as RecentFile[];
  } catch {
    return [];
  }
}

function saveRecentFiles(files: RecentFile[]): void {
  try {
    localStorage.setItem("focusmark_recent_files", JSON.stringify(files));
  } catch {
    // Silently fail
  }
}

export function addRecentFile(path: string, name: string): void {
  const files = loadRecentFiles();
  const existing = files.findIndex((f) => f.path === path);
  if (existing !== -1) {
    files.splice(existing, 1);
  }
  files.unshift({ path, name, accessedAt: Date.now() });
  if (files.length > MAX_RECENT_FILES) {
    files.length = MAX_RECENT_FILES;
  }
  saveRecentFiles(files);
}

export function getRecentFiles(): RecentFile[] {
  return loadRecentFiles();
}

export function clearRecentFiles(): void {
  saveRecentFiles([]);
}
