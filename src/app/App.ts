import type {
  DocumentState,
  EditorController,
  CommandContext,
  Preferences,
} from "./types";
import {
  getDocument,
  setDocument,
  updateDocument,
  setCurrentText,
  subscribe,
  createDocumentState,
  pushUndoState,
} from "./state";
import {
  getPreferences,
  setPreferences,
  loadPreferencesFromDisk,
  loadPreferencesFromTauri,
} from "./preferences";
import { matchShortcut, getShortcuts } from "./preferences";
import { commandRegistry } from "./commands";
import { SourceEditor, BlockEditor } from "../editor/FocusEditor";
import { parseBlocks, renderBlocks, sanitizeHtml } from "../markdown/index";
import { configureRenderer } from "../markdown/renderer";
import { ToolbarUi } from "../ui/Toolbar";
import { StatusBarUi } from "../ui/StatusBar";
import { FindBoxUi } from "../ui/FindBox";
import { SettingsUi } from "../ui/Settings";
import { AboutUi } from "../ui/About";
import {
  handleNew,
  handleOpen,
  handleSave,
  handleSaveAs,
  handleClose,
  showSavePrompt,
} from "../file/FileController";

const TYPING_DEBOUNCE_MS = 500;

export class App {
  private editor: SourceEditor | null = null;
  private editorContainer: HTMLElement;
  private toolbarUi!: ToolbarUi;
  private statusBarUi!: StatusBarUi;
  private findBoxUi!: FindBoxUi;
  private settingsUi!: SettingsUi;
  private aboutUi!: AboutUi;
  private prefs: Preferences;
  private renderedContainer: HTMLElement | null = null;
  private blockEditor: BlockEditor | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressRender = false;
  private activeBlockIdCache: string | null = null;
  private activeBlockStartOffset = 0;
  private activeBlockEndOffset = 0;

  constructor() {
    this.editorContainer = document.getElementById("editor-container")!;
    this.prefs = loadPreferencesFromDisk();
    setPreferences(this.prefs);
    this.applyTheme();

    this.toolbarUi = new ToolbarUi("toolbar", this.getContext());
    this.statusBarUi = new StatusBarUi("status-bar", this.getContext());
    this.findBoxUi = new FindBoxUi();
    this.settingsUi = new SettingsUi(this.getContext());
    this.aboutUi = new AboutUi();

    // Init immediately, load Tauri prefs in background
    this.init();
    loadPreferencesFromTauri().then((p) => {
      if (p) { this.prefs = p; setPreferences(p); }
    }).catch(() => {});
  }

  getContext(): CommandContext {
    return {
      get document() { return getDocument(); },
      get preferences() { return getPreferences(); },
      get editor() {
        return _app.getActiveEditor();
      },
      file: {
        getDocument: () => getDocument(),
        updateDocument: (p: Partial<DocumentState>) => updateDocument(p),
        newFile: () => _app.newFile(),
        openFile: () => _app.openFile(),
        saveFile: () => _app.saveFile(),
        saveFileAs: () => _app.saveFileAs(),
        closeFile: () => _app.closeFile(),
        promptSave: () => _app.promptSave(),
        isDirty: () => getDocument().dirty,
      },
      ui: {
        showToolbar: (v: boolean) => _app.toolbarUi.showToolbar(v),
        showStatusBar: (v: boolean) => _app.statusBarUi.showStatusBar(v),
        showFindBox: () => _app.findBoxUi.showFindBox(),
        hideFindBox: () => _app.findBoxUi.hideFindBox(),
        showSettings: () => _app.settingsUi.showSettings(),
        hideSettings: () => _app.settingsUi.hideSettings(),
        showAbout: () => _app.aboutUi.showAbout(),
        hideAbout: () => _app.aboutUi.hideAbout(),
        updateToolbar: () => _app.toolbarUi.updateToolbar(),
        updateStatusBar: () => _app.statusBarUi.updateStatusBar(),
        updateTitle: () => _app.updateWindowTitle(),
      },
    };
  }

  private init(): void {
    try {
      this.prefs = getPreferences();
      this.toolbarUi.init();
      this.statusBarUi.init();
      this.toolbarUi.showToolbar(this.prefs.showToolbar);
      this.statusBarUi.showStatusBar(this.prefs.showStatusBar);

      document.documentElement.style.setProperty("--editor-font-size", `${this.prefs.fontSize}px`);
      document.documentElement.style.setProperty("--editor-font-family", this.prefs.editorFontFamily);
      document.documentElement.style.setProperty("--reader-font-family", this.prefs.readerFontFamily);
      this.applyLineWidth();
      configureRenderer(this.prefs.htmlHandling);

      subscribe(() => this.onStateChange());
      document.addEventListener("keydown", (e) => this.handleKeyDown(e));

      const doc = getDocument();
      if (doc.mode === "rendered") {
        this.setupRenderedView();
      } else {
        this.setupSourceView();
      }

      this.handleLaunchArgs();
      window.addEventListener("beforeunload", (e) => {
        if (getDocument().dirty) {
          e.preventDefault();
          e.returnValue = "";
        }
      });
      this.listenForMenuCommands();
    } catch (e) {
      console.error("FocusMark init failed:", e);
      this.editorContainer.innerHTML = `<div style="padding:32px;color:red;font-family:monospace;">
        <h3>Initialization Error</h3>
        <pre>${String(e)}</pre>
      </div>`;
    }
  }

  getActiveEditor(): EditorController | null {
    const doc = getDocument();
    if (doc.mode === "source" && this.editor) return this.editor;
    if (doc.mode === "rendered" && this.blockEditor) return this.blockEditor;
    return this.editor;
  }

  async newFile(): Promise<void> {
    try {
      await handleNew();
      this.afterFileOp();
    } catch (e) {
      console.error("newFile failed:", e);
    }
  }

  async openFile(): Promise<void> {
    try {
      await handleOpen();
      this.afterFileOp();
    } catch (e) {
      console.error("openFile failed:", e);
    }
  }

  async saveFile(): Promise<void> {
    try {
      await handleSave();
    } catch (e) {
      console.error("saveFile failed:", e);
    }
  }

  async saveFileAs(): Promise<void> {
    try {
      await handleSaveAs();
    } catch (e) {
      console.error("saveFileAs failed:", e);
    }
  }

  async closeFile(): Promise<void> {
    try {
      await handleClose();
    } catch (e) {
      console.error("closeFile failed:", e);
    }
  }

  async promptSave(): Promise<"save" | "discard" | "cancel"> {
    return showSavePrompt(getDocument().fileName);
  }

  private afterFileOp(): void {
    this.clearDebounce();
    this.suppressRender = false;
    const doc = getDocument();
    if (doc.mode === "rendered") {
      this.setupRenderedView();
    } else {
      this.setupSourceView();
    }
  }

  private async handleLaunchArgs(): Promise<void> {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const args: string[] = await invoke("get_launch_file_args");
      if (args.length > 0) {
        this.openFileByPath(args[0]);
      }
    } catch {
      // Not running in Tauri
    }
  }

  // ─── State change handler ───────────────────────────────────────

  private onStateChange(): void {
    if (this.suppressRender) {
      // Only update chrome during typing; skip heavy re-render
      this.toolbarUi.updateToolbar();
      this.statusBarUi.updateStatusBar();
      this.updateWindowTitle();
      return;
    }

    const doc = getDocument();

    if (doc.mode === "source" && this.renderedContainer !== null) {
      this.setupSourceView();
    } else if (doc.mode === "rendered" && this.editor !== null) {
      this.setupRenderedView();
    } else if (doc.mode === "rendered") {
      this.renderDocument();
    }

    this.toolbarUi.updateToolbar();
    this.statusBarUi.updateStatusBar();
    this.updateWindowTitle();
  }

  // ─── Rendering ──────────────────────────────────────────────────

  private renderDocument(): void {
    const doc = getDocument();
    if (doc.mode === "source") return;
    if (doc.activeBlockId) {
      this.renderBlockEditor();
    } else {
      this.renderFullDocument();
    }
  }

  private renderFullDocument(): void {
    if (!this.renderedContainer) {
      this.editorContainer.innerHTML = "";
      this.renderedContainer = document.createElement("div");
      this.renderedContainer.className = "rendered-document";
      this.editorContainer.appendChild(this.renderedContainer);
    }

    const doc = getDocument();
    const blocks = renderBlocks(parseBlocks(doc.currentText));
    this.renderedContainer.innerHTML = "";

    for (const block of blocks) {
      const el = document.createElement("div");
      el.className = `rendered-block block-${block.type}`;
      el.dataset.blockId = block.id;

      if (block.source.trim() === "") {
        el.classList.add("empty-block");
        el.innerHTML = "&nbsp;";
      } else {
        el.innerHTML = sanitizeHtml(block.html);
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.activateBlock(block.id);
      });

      this.renderedContainer!.appendChild(el);
    }
  }

  private renderBlockEditor(): void {
    const doc = getDocument();
    if (!doc.activeBlockId) return;

    const blocks = parseBlocks(doc.currentText);
    const block = blocks.find((b) => b.id === doc.activeBlockId);
    if (!block) {
      updateDocument({ activeBlockId: null });
      return;
    }

    // Only recreate the block editor if the active block ID actually changed
    const blockChanged = this.activeBlockIdCache !== doc.activeBlockId;

    // Clean up old block editor if the block changed
    if (blockChanged && this.blockEditor) {
      this.blockEditor.unmount();
      this.blockEditor = null;
    }

    if (!this.renderedContainer) {
      this.editorContainer.innerHTML = "";
      this.renderedContainer = document.createElement("div");
      this.renderedContainer.className = "rendered-document";
      this.editorContainer.appendChild(this.renderedContainer);
    }

    const allBlocks = renderBlocks(parseBlocks(doc.currentText));
    this.renderedContainer.innerHTML = "";

    for (const b of allBlocks) {
      const el = document.createElement("div");
      el.className = `rendered-block block-${b.type}`;
      el.dataset.blockId = b.id;

      if (b.id === doc.activeBlockId) {
        el.classList.add("active-block");
        const editorHost = document.createElement("div");
        editorHost.className = "block-editor-host";
        el.appendChild(editorHost);

        if (blockChanged) {
          // Create new block editor only when necessary
          this.blockEditor = new BlockEditor(editorHost, block.source, (text) => {
            this.onBlockTyping(block.id, text);
          });
          this.blockEditor.setOnBlur(() => this.deactivateBlock());
          this.blockEditor.mount();
          this.activeBlockIdCache = block.id;
        }
      } else {
        if (b.source.trim() === "") {
          el.classList.add("empty-block");
          el.innerHTML = "&nbsp;";
        } else {
          el.innerHTML = sanitizeHtml(b.html);
        }
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          this.activateBlock(b.id);
        });
      }

      this.renderedContainer!.appendChild(el);
    }
  }

  // ─── Block editing (debounced, no per-keystroke AST re-parse) ──

  private onBlockTyping(blockId: string, newSource: string): void {
    // Push current state to undo stack before first edit in this session
    pushUndoState(getDocument().currentText);

    // Update document text directly using cached offsets — no AST re-parse
    const doc = getDocument();
    const before = doc.currentText.slice(0, this.activeBlockStartOffset);
    const after = doc.currentText.slice(this.activeBlockEndOffset);

    // Track delta to update cached offsets for subsequent edits
    const oldLen = this.activeBlockEndOffset - this.activeBlockStartOffset;
    const delta = newSource.length - oldLen;
    this.activeBlockEndOffset += delta;

    // Suppress full re-render during typing
    this.suppressRender = true;
    setCurrentText(before + newSource + after);

    // Reset debounce timer — re-render after typing pauses
    this.clearDebounce();
    this.typingTimer = setTimeout(() => {
      this.suppressRender = false;
      // Refresh offset cache from AST, but don't destroy the editor
      const updatedDoc = getDocument();
      const updatedBlocks = parseBlocks(updatedDoc.currentText);
      const updatedBlock = updatedBlocks.find((b) => b.id === blockId);
      if (updatedBlock) {
        this.activeBlockStartOffset = updatedBlock.startOffset;
        this.activeBlockEndOffset = updatedBlock.endOffset;
      }
      this.renderBlockEditor();
    }, TYPING_DEBOUNCE_MS);
  }

  private clearDebounce(): void {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  // ─── Block activation/deactivation ──────────────────────────────

  private activateBlock(blockId: string): void {
    this.clearDebounce();
    this.suppressRender = false;
    this.blockEditor?.unmount();
    this.blockEditor = null;
    this.activeBlockIdCache = null;

    // Cache block offsets for delta-based editing (avoid per-keystroke AST re-parse)
    const doc = getDocument();
    const blocks = parseBlocks(doc.currentText);
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      this.activeBlockStartOffset = block.startOffset;
      this.activeBlockEndOffset = block.endOffset;
    }

    updateDocument({ activeBlockId: blockId });
  }

  private deactivateBlock(): void {
    this.clearDebounce();
    this.suppressRender = false;
    this.blockEditor?.unmount();
    this.blockEditor = null;
    this.activeBlockIdCache = null;
    updateDocument({ activeBlockId: null });
  }

  // ─── Source / Rendered view setup ───────────────────────────────

  private setupSourceView(): void {
    this.clearDebounce();
    this.suppressRender = false;
    this.blockEditor?.unmount();
    this.blockEditor = null;
    this.activeBlockIdCache = null;
    this.renderedContainer = null;
    this.editorContainer.innerHTML = "";
    updateDocument({ activeBlockId: null });

    const doc = getDocument();
    this.editor = new SourceEditor(this.editorContainer, doc.currentText, (text) => {
      pushUndoState(getDocument().currentText);
      setCurrentText(text);
    });
    this.editor.mount();
  }

  private setupRenderedView(): void {
    this.clearDebounce();
    this.suppressRender = false;
    if (this.editor) {
      this.editor.unmount();
      this.editor = null;
    }
    this.editorContainer.innerHTML = "";
    this.renderedContainer = null;
    this.renderFullDocument();

    // If document is empty, auto-activate the empty block so user can type immediately
    const doc = getDocument();
    if (doc.currentText.trim() === "" && doc.activeBlockId === null) {
      const blocks = parseBlocks(doc.currentText);
      if (blocks.length > 0) {
        updateDocument({ activeBlockId: blocks[0].id });
      }
    }
  }

  // ─── Menu & event listeners ─────────────────────────────────────

  private listenForMenuCommands(): void {
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<string>("menu-command", (event) => {
        const cmd = commandRegistry.find((c) => c.id === event.payload);
        if (cmd) {
          cmd.run(this.getContext());
        }
      });
      listen<string>("open-file", (event) => {
        this.openFileByPath(event.payload);
      });
    }).catch(() => {
      // Not in Tauri environment, menu events unavailable
    });
  }

  private async openFileByPath(filePath: string): Promise<void> {
    try {
      const doc = getDocument();
      if (doc.dirty) {
        const choice = await showSavePrompt(doc.fileName);
        if (choice === "cancel") return;
        if (choice === "save") {
          await handleSave();
        }
      }
      const { openFileByPath } = await import("../file/FileController");
      const file = await openFileByPath(filePath);
      if (file) {
        const newDoc = createDocumentState();
        newDoc.filePath = file.path;
        newDoc.fileName = file.name;
        newDoc.originalText = file.contents;
        newDoc.currentText = file.contents;
        newDoc.lineEnding = file.detectedLineEnding;
        newDoc.hadBom = file.hadBom;
        newDoc.dirty = false;
        newDoc.mode = this.prefs.defaultMode;
        setDocument(newDoc);
      }
    } catch (e) {
      console.error("openFileByPath failed:", e);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Skip shortcut matching when typing in a CodeMirror editor (except Escape)
    const target = e.target as HTMLElement;
    if (target && (target.closest(".cm-content") || target.closest(".cm-editor"))) {
      // Let CodeMirror handle all keys internally except Escape for block exit
      if (e.key !== "Escape") return;
    }

    const shortcuts = getShortcuts();

    for (const cmd of commandRegistry) {
      const bindings = shortcuts[cmd.id] || [];
      for (const binding of bindings) {
        if (matchShortcut(binding, e)) {
          e.preventDefault();
          e.stopPropagation();
          const ctx = this.getContext();
          cmd.run(ctx);
          return;
        }
      }
    }
  }

  // ─── Window title ───────────────────────────────────────────────

  private updateWindowTitle(): void {
    const doc = getDocument();
    const title = doc.dirty
      ? `\u25CF ${doc.fileName} - FocusMark`
      : `${doc.fileName} - FocusMark`;
    document.title = title;
  }

  // ─── Theme ──────────────────────────────────────────────────────

  private applyTheme(): void {
    const theme = this.prefs.theme;
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  }

  private applyLineWidth(): void {
    const map: Record<string, string> = {
      narrow: "650px",
      normal: "780px",
      wide: "900px",
    };
    document.documentElement.style.setProperty("--doc-max-width", map[this.prefs.lineWidth] || "780px");
  }
}

let _app: App;

export function init(): void {
  _app = new App();
}
