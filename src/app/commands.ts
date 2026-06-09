import type { Command, CommandId, CommandContext } from "./types";
import {
  getDocument,
  updateDocument,
  undoDocument,
  redoDocument,
} from "./state";
import { findNextBlock, findPreviousBlock, parseBlocks } from "../markdown/index";
import { defaultShortcutMap, updatePreferences, getPreferences } from "./preferences";
import {
  handleNew,
  handleOpen,
  handleSave,
  handleSaveAs,
  handleClose,
} from "../file/FileController";
import {
  toggleBold,
  toggleItalic,
  toggleInlineCode,
  toggleStrikethrough,
  insertLink,
  setHeadingLevel,
  toggleBulletList,
  toggleNumberedList,
  toggleTaskList,
  toggleQuote,
  toggleCodeBlock,
} from "../editor/editingCommands";

function createCommand(
  id: CommandId,
  label: string,
  category: Command["category"],
  run: (ctx: CommandContext) => Promise<void> | void,
  enabled?: (ctx: CommandContext) => boolean
): Command {
  return {
    id,
    label,
    category,
    defaultShortcuts: defaultShortcutMap[id] || [],
    run,
    enabled,
  };
}

export const commandRegistry: Command[] = [
  // File
  createCommand("file.new", "New", "File", async (ctx) => {
    await handleNew();
    ctx.ui.updateToolbar();
    ctx.ui.updateStatusBar();
    ctx.ui.updateTitle();
  }),
  createCommand("file.open", "Open...", "File", async (ctx) => {
    await handleOpen();
    ctx.ui.updateToolbar();
    ctx.ui.updateStatusBar();
    ctx.ui.updateTitle();
  }),
  createCommand("file.save", "Save", "File", async (ctx) => {
    await handleSave();
    ctx.ui.updateToolbar();
    ctx.ui.updateStatusBar();
    ctx.ui.updateTitle();
  }),
  createCommand("file.saveAs", "Save As...", "File", async (ctx) => {
    await handleSaveAs();
    ctx.ui.updateToolbar();
    ctx.ui.updateStatusBar();
    ctx.ui.updateTitle();
  }),
  createCommand("file.close", "Close", "File", async (ctx) => {
    await handleClose();
    ctx.ui.updateToolbar();
    ctx.ui.updateStatusBar();
    ctx.ui.updateTitle();
  }),
  createCommand("app.quit", "Quit", "File", async () => {
    await handleClose();
  }),

  // Edit
  createCommand("edit.undo", "Undo", "Edit", () => {
    undoDocument();
  }),
  createCommand("edit.redo", "Redo", "Edit", () => {
    redoDocument();
  }),
  createCommand("edit.cut", "Cut", "Edit", (ctx) => {
    ctx.editor?.cut();
  }),
  createCommand("edit.copy", "Copy", "Edit", (ctx) => {
    ctx.editor?.copy();
  }),
  createCommand("edit.paste", "Paste", "Edit", (ctx) => {
    ctx.editor?.paste();
  }),
  createCommand("edit.selectAll", "Select All", "Edit", (ctx) => {
    ctx.editor?.selectAll();
  }),
  createCommand("edit.find", "Find", "Edit", (ctx) => {
    ctx.ui.showFindBox();
  }),

  // View
  createCommand("view.toggleSourceMode", "Toggle Source Mode", "View", () => {
    const doc = getDocument();
    const newMode = doc.mode === "rendered" ? "source" : "rendered";
    updateDocument({ mode: newMode, activeBlockId: null });
  }),
  createCommand("view.increaseFontSize", "Increase Font Size", "View", () => {
    const prefs = getPreferences();
    const newSize = Math.min(prefs.fontSize + 1, 32);
    updatePreferences({ fontSize: newSize });
    document.documentElement.style.setProperty("--editor-font-size", `${newSize}px`);
  }),
  createCommand("view.decreaseFontSize", "Decrease Font Size", "View", () => {
    const prefs = getPreferences();
    const newSize = Math.max(prefs.fontSize - 1, 10);
    updatePreferences({ fontSize: newSize });
    document.documentElement.style.setProperty("--editor-font-size", `${newSize}px`);
  }),
  createCommand("view.resetFontSize", "Reset Font Size", "View", () => {
    updatePreferences({ fontSize: 16 });
    document.documentElement.style.setProperty("--editor-font-size", "16px");
  }),
  createCommand("view.toggleToolbar", "Toggle Toolbar", "View", (ctx) => {
    const prefs = getPreferences();
    const visible = !prefs.showToolbar;
    updatePreferences({ showToolbar: visible });
    ctx.ui.showToolbar(visible);
  }),
  createCommand("view.toggleStatusBar", "Toggle Status Bar", "View", (ctx) => {
    const prefs = getPreferences();
    const visible = !prefs.showStatusBar;
    updatePreferences({ showStatusBar: visible });
    ctx.ui.showStatusBar(visible);
  }),

  // Format
  createCommand("format.bold", "Bold", "Format", (ctx) => {
    if (ctx.editor) toggleBold(ctx.editor);
  }),
  createCommand("format.italic", "Italic", "Format", (ctx) => {
    if (ctx.editor) toggleItalic(ctx.editor);
  }),
  createCommand("format.inlineCode", "Inline Code", "Format", (ctx) => {
    if (ctx.editor) toggleInlineCode(ctx.editor);
  }),
  createCommand("format.strikethrough", "Strikethrough", "Format", (ctx) => {
    if (ctx.editor) toggleStrikethrough(ctx.editor);
  }),
  createCommand("format.link", "Link", "Format", (ctx) => {
    if (ctx.editor) insertLink(ctx.editor);
  }),
  createCommand("format.heading1", "Heading 1", "Format", (ctx) => {
    if (ctx.editor) setHeadingLevel(ctx.editor, 1);
  }),
  createCommand("format.heading2", "Heading 2", "Format", (ctx) => {
    if (ctx.editor) setHeadingLevel(ctx.editor, 2);
  }),
  createCommand("format.heading3", "Heading 3", "Format", (ctx) => {
    if (ctx.editor) setHeadingLevel(ctx.editor, 3);
  }),
  createCommand("format.bulletList", "Bullet List", "Format", (ctx) => {
    if (ctx.editor) toggleBulletList(ctx.editor);
  }),
  createCommand("format.numberedList", "Numbered List", "Format", (ctx) => {
    if (ctx.editor) toggleNumberedList(ctx.editor);
  }),
  createCommand("format.taskList", "Task List", "Format", (ctx) => {
    if (ctx.editor) toggleTaskList(ctx.editor);
  }),
  createCommand("format.quote", "Quote", "Format", (ctx) => {
    if (ctx.editor) toggleQuote(ctx.editor);
  }),
  createCommand("format.codeBlock", "Code Block", "Format", (ctx) => {
    if (ctx.editor) toggleCodeBlock(ctx.editor);
  }),

  // Navigate
  createCommand("navigate.nextBlock", "Next Block", "Navigate", () => {
    const doc = getDocument();
    const blocks = parseBlocks(doc.currentText);
    const next = findNextBlock(blocks, doc.activeBlockId);
    if (next) {
      updateDocument({ activeBlockId: next.id });
    }
  }),
  createCommand("navigate.previousBlock", "Previous Block", "Navigate", () => {
    const doc = getDocument();
    const blocks = parseBlocks(doc.currentText);
    const prev = findPreviousBlock(blocks, doc.activeBlockId);
    if (prev) {
      updateDocument({ activeBlockId: prev.id });
    }
  }),
  createCommand("navigate.editCurrentBlock", "Edit Current Block", "Navigate", () => {
    const doc = getDocument();
    if (doc.mode === "rendered" && !doc.activeBlockId && doc.currentText.length > 0) {
      const blocks = parseBlocks(doc.currentText);
      if (blocks.length > 0) {
        updateDocument({ activeBlockId: blocks[0].id });
      }
    }
  }),
  createCommand("navigate.exitBlock", "Exit Block", "Navigate", () => {
    updateDocument({ activeBlockId: null });
  }),

  // Settings
  createCommand("settings.open", "Settings...", "Settings", (ctx) => {
    ctx.ui.showSettings();
  }),

  // Help
  createCommand("help.about", "About FocusMark", "Help", (ctx) => {
    ctx.ui.showAbout();
  }),
];

export function getCommand(id: CommandId): Command | undefined {
  return commandRegistry.find((cmd) => cmd.id === id);
}

export function getCommandsByCategory(category: Command["category"]): Command[] {
  return commandRegistry.filter((cmd) => cmd.category === category);
}

export function runCommand(id: CommandId, context: CommandContext): void {
  const cmd = getCommand(id);
  if (cmd) {
    cmd.run(context);
  }
}
