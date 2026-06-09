import type {
  DocumentState,
  EditorMode,
  SourceSelection,
} from "./types";
import { platform } from "./platform";

export function createDocumentState(): DocumentState {
  return {
    filePath: null,
    fileName: "Untitled",
    originalText: "",
    currentText: "",
    lineEnding: platform.isWindows ? "\r\n" : "\n",
    hadBom: false,
    dirty: false,
    activeBlockId: null,
    selection: null,
    lastSavedAt: null,
    fileModifiedAt: null,
    mode: "rendered",
  };
}

let _doc: DocumentState = createDocumentState();

const listeners: Array<() => void> = [];

// ── Document-level undo stack ────────────────────────────────────

const MAX_UNDO = 200;
let _undoStack: string[] = [];
let _undoIndex = -1;

export function pushUndoState(text: string): void {
  // Don't push if text hasn't changed from the last pushed state
  if (_undoIndex >= 0 && _undoStack[_undoIndex] === text) return;

  // Trim any redo states beyond current index
  _undoStack = _undoStack.slice(0, _undoIndex + 1);
  _undoStack.push(text);
  if (_undoStack.length > MAX_UNDO) {
    _undoStack.shift();
  }
  _undoIndex = _undoStack.length - 1;
}

export function undoDocument(): string | null {
  if (_undoIndex <= 0) return null;
  _undoIndex--;
  const text = _undoStack[_undoIndex];
  _doc.currentText = text;
  _doc.dirty = _doc.currentText !== _doc.originalText;
  notify();
  return text;
}

export function redoDocument(): string | null {
  if (_undoIndex >= _undoStack.length - 1) return null;
  _undoIndex++;
  const text = _undoStack[_undoIndex];
  _doc.currentText = text;
  _doc.dirty = _doc.currentText !== _doc.originalText;
  notify();
  return text;
}

export function resetUndoStack(): void {
  _undoStack = [];
  _undoIndex = -1;
}

// ── Document state ───────────────────────────────────────────────

export function getDocument(): DocumentState {
  return _doc;
}

export function setDocument(doc: DocumentState): void {
  _doc = doc;
  resetUndoStack();
  notify();
}

export function updateDocument(partial: Partial<DocumentState>): void {
  _doc = { ..._doc, ...partial };
  notify();
}

export function markClean(): void {
  _doc.dirty = false;
  _doc.originalText = _doc.currentText;
  _doc.lastSavedAt = Date.now();
  resetUndoStack();
  notify();
}

export function setDirty(): void {
  _doc.dirty = true;
  notify();
}

export function setMode(mode: EditorMode): void {
  _doc.mode = mode;
  notify();
}

export function setActiveBlock(id: string | null): void {
  _doc.activeBlockId = id;
  notify();
}

export function setSelection(sel: SourceSelection | null): void {
  _doc.selection = sel;
  notify();
}

export function setCurrentText(text: string): void {
  _doc.currentText = text;
  _doc.dirty = _doc.currentText !== _doc.originalText;
  notify();
}

export function getBlockText(startOffset: number, endOffset: number): string {
  return _doc.currentText.slice(startOffset, endOffset);
}

export function replaceBlock(
  startOffset: number,
  endOffset: number,
  newText: string
): void {
  const before = _doc.currentText.slice(0, startOffset);
  const after = _doc.currentText.slice(endOffset);
  _doc.currentText = before + newText + after;
  _doc.dirty = _doc.currentText !== _doc.originalText;
  notify();
}

export function subscribe(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notify(): void {
  for (const fn of listeners) fn();
}
