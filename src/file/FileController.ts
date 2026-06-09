import type { LineEnding, OpenedFile, SavedFile } from "../app/types";
import { getDocument, updateDocument, markClean, setDocument, createDocumentState } from "../app/state";
import { addRecentFile } from "./recentFiles";
import { detectLineEnding } from "./lineEndings";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

const USE_TAURI_BACKEND = typeof window !== "undefined" && !!(window as any).__TAURI__;

export async function openFileDialog(): Promise<OpenedFile | null> {
  const selected = await open({
    multiple: false,
    filters: [
      { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (!selected) return null;
  const path = selected as string;

  if (USE_TAURI_BACKEND) {
    try {
      return await invoke<OpenedFile>("open_file_by_path", { path });
    } catch (e) {
      console.error("Backend open failed, falling back:", e);
    }
  }

  // Fallback: use plugin-fs
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const contents = await readTextFile(path);
    const lineEnding = detectLineEnding(contents);
    const name = path.split(/[/\\]/).pop() || "Untitled";
    const hadBom = contents.charCodeAt(0) === 0xFEFF;
    const cleanContents = hadBom ? contents.slice(1) : contents;
    return { path, name, contents: cleanContents, detectedLineEnding: lineEnding, hadBom, modifiedAt: null };
  } catch (e) {
    console.error("Failed to open file:", e);
    return null;
  }
}

export async function openFileByPath(filePath: string): Promise<OpenedFile | null> {
  if (USE_TAURI_BACKEND) {
    try {
      return await invoke<OpenedFile>("open_file_by_path", { path: filePath });
    } catch (e) {
      console.error("Backend open failed, falling back:", e);
    }
  }

  // Fallback: use plugin-fs
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const contents = await readTextFile(filePath);
    const lineEnding = detectLineEnding(contents);
    const name = filePath.split(/[/\\]/).pop() || "Untitled";
    const hadBom = contents.charCodeAt(0) === 0xFEFF;
    const cleanContents = hadBom ? contents.slice(1) : contents;
    return { path: filePath, name, contents: cleanContents, detectedLineEnding: lineEnding, hadBom, modifiedAt: null };
  } catch (e) {
    console.error("Failed to open file:", e);
    return null;
  }
}

export async function saveFileToPath(
  path: string,
  contents: string,
  lineEnding: LineEnding,
  preserveBom: boolean
): Promise<SavedFile | null> {
  if (USE_TAURI_BACKEND) {
    try {
      return await invoke<SavedFile>("save_file", {
        path,
        contents,
        options: { line_ending: lineEnding, preserve_bom: preserveBom },
      });
    } catch (e) {
      console.error("Backend save failed, falling back:", e);
    }
  }

  // Fallback: use plugin-fs
  try {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const normalized =
      lineEnding === "\r\n"
        ? contents.replace(/\r?\n/g, "\r\n")
        : contents.replace(/\r\n/g, "\n");
    await writeTextFile(path, normalized);
    return { path, modifiedAt: null };
  } catch (e) {
    console.error("Failed to save file:", e);
    return null;
  }
}

export async function saveFileDialog(defaultName?: string): Promise<string | null> {
  const selected = await save({
    defaultPath: defaultName || "Untitled.md",
    filters: [
      { name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] },
    ],
  });
  return selected || null;
}

export async function handleOpen(): Promise<boolean> {
  const doc = getDocument();
  if (doc.dirty) {
    const choice = await showSavePrompt(doc.fileName);
    if (choice === "cancel") return false;
    if (choice === "save") {
      const saved = await handleSave();
      if (!saved) return false;
    }
  }

  const file = await openFileDialog();
  if (!file) return false;

  const newDoc = createDocumentState();
  newDoc.filePath = file.path;
  newDoc.fileName = file.name;
  newDoc.originalText = file.contents;
  newDoc.currentText = file.contents;
  newDoc.lineEnding = file.detectedLineEnding;
  newDoc.hadBom = file.hadBom;
  newDoc.dirty = false;
  newDoc.fileModifiedAt = file.modifiedAt;
  setDocument(newDoc);
  addRecentFile(file.path, file.name);
  return true;
}

export async function handleSave(): Promise<boolean> {
  const doc = getDocument();
  if (!doc.filePath) return handleSaveAs();

  const result = await saveFileToPath(doc.filePath, doc.currentText, doc.lineEnding, doc.hadBom);
  if (!result) return false;

  markClean();
  return true;
}

export async function handleSaveAs(): Promise<boolean> {
  const doc = getDocument();
  const defaultName = doc.fileName || "Untitled.md";
  const path = await saveFileDialog(defaultName);
  if (!path) return false;

  const result = await saveFileToPath(path, doc.currentText, doc.lineEnding, doc.hadBom);
  if (!result) return false;

  const newName = path.split(/[/\\]/).pop() || "Untitled";
  updateDocument({ filePath: path, fileName: newName });
  markClean();
  addRecentFile(path, newName);
  return true;
}

export async function handleNew(): Promise<boolean> {
  const doc = getDocument();
  if (doc.dirty) {
    const choice = await showSavePrompt(doc.fileName);
    if (choice === "cancel") return false;
    if (choice === "save") {
      const saved = await handleSave();
      if (!saved) return false;
    }
  }
  setDocument(createDocumentState());
  return true;
}

export async function handleClose(): Promise<boolean> {
  const doc = getDocument();
  if (doc.dirty) {
    const choice = await showSavePrompt(doc.fileName);
    if (choice === "cancel") return false;
    if (choice === "save") {
      const saved = await handleSave();
      if (!saved) return false;
    }
  }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch {
    window.close();
  }
  return true;
}

export function showSavePrompt(fileName: string): Promise<"save" | "discard" | "cancel"> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";

    const dialog = document.createElement("div");
    dialog.className = "dialog";
    dialog.innerHTML = `
      <div class="dialog-content">
        <p>Save changes to <strong>${escapeHtml(fileName)}</strong>?</p>
        <p class="dialog-subtitle">Your changes will be lost if you don't save them.</p>
      </div>
      <div class="dialog-actions">
        <button class="dialog-btn primary" data-action="save">Save</button>
        <button class="dialog-btn" data-action="discard">Discard</button>
        <button class="dialog-btn" data-action="cancel">Cancel</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", handleKey);
        resolve("cancel");
      }
    };
    document.addEventListener("keydown", handleKey);

    dialog.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action as "save" | "discard" | "cancel";
        document.removeEventListener("keydown", handleKey);
        overlay.remove();
        resolve(action);
      });
    });

    const saveBtn = dialog.querySelector('[data-action="save"]') as HTMLElement;
    if (saveBtn) saveBtn.focus();
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
