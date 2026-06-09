import type { UiController, CommandContext } from "../app/types";
import { getDocument, subscribe } from "../app/state";
import { getPreferences } from "../app/preferences";
import { splitLines } from "../file/lineEndings";

export class StatusBarUi implements UiController {
  private container: HTMLElement;
  private visible = true;

  constructor(containerId: string, _context: CommandContext) {
    this.container = document.getElementById(containerId)!;
    this.visible = getPreferences().showStatusBar;
  }

  init(): void {
    this.render();
    subscribe(() => this.update());
  }

  private render(): void {
    this.container.innerHTML = "";

    const bar = document.createElement("div");
    bar.className = "status-bar";
    if (!this.visible) bar.classList.add("hidden");
    bar.id = "status-bar-inner";

    const dirtyEl = document.createElement("span");
    dirtyEl.className = "status-item";
    dirtyEl.id = "status-dirty";

    const encodingEl = document.createElement("span");
    encodingEl.className = "status-item";
    encodingEl.textContent = "UTF-8";

    const lineEndingEl = document.createElement("span");
    lineEndingEl.className = "status-item";
    lineEndingEl.id = "status-line-ending";

    const positionEl = document.createElement("span");
    positionEl.className = "status-item";
    positionEl.id = "status-position";

    const wordCountEl = document.createElement("span");
    wordCountEl.className = "status-item";
    wordCountEl.id = "status-word-count";

    bar.appendChild(dirtyEl);
    bar.appendChild(encodingEl);
    bar.appendChild(lineEndingEl);
    bar.appendChild(document.createElement("span")); // spacer
    bar.appendChild(positionEl);
    bar.appendChild(wordCountEl);

    this.container.appendChild(bar);
    this.update();
  }

  update(): void {
    const doc = getDocument();
    const dirtyEl = document.getElementById("status-dirty");
    const lineEndingEl = document.getElementById("status-line-ending");
    const positionEl = document.getElementById("status-position");
    const wordCountEl = document.getElementById("status-word-count");

    if (dirtyEl) {
      dirtyEl.textContent = doc.dirty ? "⚫ Modified" : "Saved";
    }
    if (lineEndingEl) {
      lineEndingEl.textContent = doc.lineEnding === "\r\n" ? "CRLF" : "LF";
    }
    if (positionEl) {
      const lines = splitLines(doc.currentText);
      positionEl.textContent = `Ln ${lines.length}, Col 0`;
    }
    if (wordCountEl) {
      const words = doc.currentText.trim()
        ? doc.currentText.trim().split(/\s+/).length
        : 0;
      wordCountEl.textContent = `${words} words`;
    }
  }

  // UiController implementation
  showToolbar(): void {}
  showStatusBar(visible: boolean): void {
    this.visible = visible;
    const bar = document.getElementById("status-bar-inner");
    if (bar) bar.classList.toggle("hidden", !visible);
  }
  showFindBox(): void {}
  hideFindBox(): void {}
  showSettings(): void {}
  hideSettings(): void {}
  showAbout(): void {}
  hideAbout(): void {}
  updateToolbar(): void {}
  updateStatusBar(): void {
    this.update();
  }
  updateTitle(): void {}
}
