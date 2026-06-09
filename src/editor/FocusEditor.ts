import type { EditorController } from "../app/types";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { defaultKeymap, historyKeymap, history, undo, redo } from "@codemirror/commands";

export type EditorChangeCallback = (text: string) => void;

export class SourceEditor implements EditorController {
  private view: EditorView | null = null;
  private container: HTMLElement;
  private _onChange: EditorChangeCallback;
  private _initialText: string;

  constructor(
    container: HTMLElement,
    initialText: string,
    onChange: EditorChangeCallback
  ) {
    this.container = container;
    this._initialText = initialText;
    this._onChange = onChange;
  }

  mount(): void {
    if (this.view) return;

    const state = EditorState.create({
      doc: this._initialText,
      extensions: [
        basicSetup,
        keymap.of(defaultKeymap),
        keymap.of(historyKeymap),
        history(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this._onChange(this.getText());
          }
        }),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "var(--editor-font-size, 16px)",
            fontFamily: "var(--editor-font-family, monospace)",
          },
          ".cm-scroller": {
            overflow: "auto",
            lineHeight: "1.6",
          },
          ".cm-content": {
            padding: "16px",
          },
          ".cm-gutters": {
            display: "none",
          },
        }),
      ],
    });

    this.view = new EditorView({
      state,
      parent: this.container,
    });

    this.view.focus();
  }

  unmount(): void {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }

  getText(): string {
    return this.view ? this.view.state.doc.toString() : this._initialText;
  }

  setText(text: string): void {
    if (!this.view) {
      this._initialText = text;
      return;
    }
    const view = this.view;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  }

  getSelection(): { from: number; to: number } {
    if (!this.view) return { from: 0, to: 0 };
    const { from, to } = this.view.state.selection.main;
    return { from, to };
  }

  setSelection(from: number, to: number): void {
    if (!this.view) return;
    this.view.dispatch({
      selection: { anchor: from, head: to },
    });
  }

  focus(): void {
    if (this.view) this.view.focus();
  }

  undo(): void {
    if (this.view) undo(this.view);
  }

  redo(): void {
    if (this.view) redo(this.view);
  }

  cut(): void {
    document.execCommand("cut");
  }

  copy(): void {
    document.execCommand("copy");
  }

  paste(): void {
    document.execCommand("paste");
  }

  selectAll(): void {
    if (this.view) {
      const len = this.view.state.doc.length;
      this.view.dispatch({
        selection: { anchor: 0, head: len },
      });
    }
  }

  insertText(text: string): void {
    if (!this.view) return;
    const { from, to } = this.view.state.selection.main;
    this.view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
  }

  replaceRange(from: number, to: number, text: string): void {
    if (!this.view) return;
    this.view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
  }

  getCursorOffset(): number {
    return this.getSelection().from;
  }
}

export class BlockEditor implements EditorController {
  private view: EditorView | null = null;
  private container: HTMLElement;
  private _onChange: EditorChangeCallback;
  private _initialText: string;
  private _onBlur: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    initialText: string,
    onChange: EditorChangeCallback
  ) {
    this.container = container;
    this._initialText = initialText;
    this._onChange = onChange;
  }

  setOnBlur(callback: () => void): void {
    this._onBlur = callback;
  }

  mount(): void {
    if (this.view) return;

    const state = EditorState.create({
      doc: this._initialText,
      extensions: [
        basicSetup,
        keymap.of(defaultKeymap),
        keymap.of(historyKeymap),
        history(),
        keymap.of([
          {
            key: "Escape",
            run: () => {
              this._onBlur?.();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this._onChange(this.getText());
          }
        }),
        EditorView.domEventHandlers({
          blur: () => {
            // Delay to allow click events on other blocks to fire first
            setTimeout(() => {
              if (this.view && !this.view.hasFocus) {
                this._onBlur?.();
              }
            }, 150);
          },
        }),
        EditorView.theme({
          "&": {
            fontSize: "var(--editor-font-size, 16px)",
            fontFamily: "var(--editor-font-family, monospace)",
            backgroundColor: "var(--block-editor-bg, rgba(128,128,128,0.05))",
            border: "1px solid var(--block-editor-border, rgba(128,128,128,0.2))",
            borderRadius: "4px",
          },
          ".cm-scroller": {
            overflow: "auto",
            lineHeight: "1.6",
          },
          ".cm-content": {
            padding: "8px 12px",
          },
          ".cm-gutters": {
            display: "none",
          },
        }),
      ],
    });

    this.view = new EditorView({
      state,
      parent: this.container,
    });

    this.view.focus();
  }

  unmount(): void {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }

  getText(): string {
    return this.view ? this.view.state.doc.toString() : this._initialText;
  }

  setText(text: string): void {
    if (!this.view) {
      this._initialText = text;
      return;
    }
    const view = this.view;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  }

  getSelection(): { from: number; to: number } {
    if (!this.view) return { from: 0, to: 0 };
    const { from, to } = this.view.state.selection.main;
    return { from, to };
  }

  setSelection(from: number, to: number): void {
    if (!this.view) return;
    this.view.dispatch({
      selection: { anchor: from, head: to },
    });
  }

  focus(): void {
    if (this.view) this.view.focus();
  }

  undo(): void {
    if (this.view) undo(this.view);
  }

  redo(): void {
    if (this.view) redo(this.view);
  }

  cut(): void {
    document.execCommand("cut");
  }

  copy(): void {
    document.execCommand("copy");
  }

  paste(): void {
    document.execCommand("paste");
  }

  selectAll(): void {
    if (this.view) {
      const len = this.view.state.doc.length;
      this.view.dispatch({
        selection: { anchor: 0, head: len },
      });
    }
  }

  insertText(text: string): void {
    if (!this.view) return;
    const { from, to } = this.view.state.selection.main;
    this.view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
  }

  replaceRange(from: number, to: number, text: string): void {
    if (!this.view) return;
    this.view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
  }

  getCursorOffset(): number {
    return this.getSelection().from;
  }
}

export function createSourceEditor(
  container: HTMLElement,
  initialText: string,
  onChange: EditorChangeCallback
): SourceEditor {
  return new SourceEditor(container, initialText, onChange);
}

export function createBlockEditor(
  container: HTMLElement,
  initialText: string,
  onChange: EditorChangeCallback
): BlockEditor {
  return new BlockEditor(container, initialText, onChange);
}
