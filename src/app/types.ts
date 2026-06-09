export const APP_NAME = "FocusMark";

export type LineEnding = "\n" | "\r\n";

export type EditorMode = "rendered" | "source";

export type MarkdownBlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "blockquote"
  | "code_fence"
  | "table"
  | "thematic_break"
  | "html"
  | "image"
  | "unknown";

export type RenderBlock = {
  id: string;
  type: MarkdownBlockType;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  source: string;
  html: string;
};

export type SourceSelection = {
  startOffset: number;
  endOffset: number;
};

export type DocumentState = {
  filePath: string | null;
  fileName: string;
  originalText: string;
  currentText: string;
  lineEnding: LineEnding;
  hadBom: boolean;
  dirty: boolean;
  activeBlockId: string | null;
  selection: SourceSelection | null;
  lastSavedAt: number | null;
  fileModifiedAt: number | null;
  mode: EditorMode;
};

export type Theme = "system" | "light" | "dark";

export type LineWidth = "narrow" | "normal" | "wide";

export type ShortcutBinding = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export type ShortcutMap = Record<string, ShortcutBinding[]>;

export type Preferences = {
  theme: Theme;
  fontSize: number;
  editorFontFamily: string;
  readerFontFamily: string;
  lineWidth: LineWidth;
  showStatusBar: boolean;
  showToolbar: boolean;
  defaultMode: EditorMode;
  enableGfm: boolean;
  remoteImagesEnabled: boolean;
  htmlHandling: "sanitize" | "escape";
  shortcuts: ShortcutMap;
};

export type PreferencesFile = {
  version: number;
  preferences: Preferences;
};

export type CommandCategory =
  | "File"
  | "Edit"
  | "View"
  | "Format"
  | "Navigate"
  | "Settings"
  | "Help";

export type CommandId =
  | "file.new"
  | "file.open"
  | "file.save"
  | "file.saveAs"
  | "file.close"
  | "app.quit"
  | "edit.undo"
  | "edit.redo"
  | "edit.cut"
  | "edit.copy"
  | "edit.paste"
  | "edit.selectAll"
  | "edit.find"
  | "view.toggleSourceMode"
  | "view.increaseFontSize"
  | "view.decreaseFontSize"
  | "view.resetFontSize"
  | "view.toggleToolbar"
  | "view.toggleStatusBar"
  | "format.bold"
  | "format.italic"
  | "format.inlineCode"
  | "format.strikethrough"
  | "format.link"
  | "format.heading1"
  | "format.heading2"
  | "format.heading3"
  | "format.bulletList"
  | "format.numberedList"
  | "format.taskList"
  | "format.quote"
  | "format.codeBlock"
  | "navigate.nextBlock"
  | "navigate.previousBlock"
  | "navigate.editCurrentBlock"
  | "navigate.exitBlock"
  | "settings.open"
  | "help.about";

export type CommandContext = {
  document: DocumentState;
  preferences: Preferences;
  editor: EditorController | null;
  file: FileController;
  ui: UiController;
};

export type Command = {
  id: CommandId;
  label: string;
  category: CommandCategory;
  defaultShortcuts: ShortcutBinding[];
  run: (context: CommandContext) => Promise<void> | void;
  enabled?: (context: CommandContext) => boolean;
};

export interface EditorController {
  getText(): string;
  setText(text: string): void;
  getSelection(): { from: number; to: number };
  setSelection(from: number, to: number): void;
  focus(): void;
  undo(): void;
  redo(): void;
  cut(): void;
  copy(): void;
  paste(): void;
  selectAll(): void;
  insertText(text: string): void;
  replaceRange(from: number, to: number, text: string): void;
  getCursorOffset(): number;
}

export interface FileController {
  getDocument(): DocumentState;
  updateDocument(partial: Partial<DocumentState>): void;
  newFile(): Promise<void>;
  openFile(): Promise<void>;
  saveFile(): Promise<void>;
  saveFileAs(): Promise<void>;
  closeFile(): Promise<void>;
  promptSave(): Promise<"save" | "discard" | "cancel">;
  isDirty(): boolean;
}

export interface UiController {
  showToolbar(visible: boolean): void;
  showStatusBar(visible: boolean): void;
  showFindBox(): void;
  hideFindBox(): void;
  showSettings(): void;
  hideSettings(): void;
  showAbout(): void;
  hideAbout(): void;
  updateToolbar(): void;
  updateStatusBar(): void;
  updateTitle(): void;
}

export type OpenedFile = {
  path: string;
  name: string;
  contents: string;
  detectedLineEnding: LineEnding;
  hadBom: boolean;
  modifiedAt: number | null;
};

export type SaveOptions = {
  lineEnding: LineEnding;
  preserveBom: boolean;
};

export type SavedFile = {
  path: string;
  modifiedAt: number | null;
};
