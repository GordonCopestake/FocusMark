import type { UiController, CommandContext } from "../app/types";
import { getDocument } from "../app/state";
import { getPreferences, shortcutToString } from "../app/preferences";
import { runCommand } from "../app/commands";

type ToolbarButton = {
  commandId: string;
  label: string;
  shortcut: string;
  icon: string;
};

export class ToolbarUi implements UiController {
  private container: HTMLElement;
  private context: CommandContext;
  private toolbarEl: HTMLElement | null = null;
  private sourceToggleEl: HTMLElement | null = null;
  private visible = true;

  constructor(containerId: string, context: CommandContext) {
    this.container = document.getElementById(containerId)!;
    this.context = context;
    this.visible = getPreferences().showToolbar;
  }

  init(): void {
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";

    this.toolbarEl = document.createElement("div");
    this.toolbarEl.className = "toolbar";
    if (!this.visible) {
      this.toolbarEl.classList.add("hidden");
    }

    const buttons: ToolbarButton[] = [
      { commandId: "file.new", label: "New", shortcut: this.getShortcutStr("file.new"), icon: "📄" },
      { commandId: "file.open", label: "Open", shortcut: this.getShortcutStr("file.open"), icon: "📂" },
      { commandId: "file.save", label: "Save", shortcut: this.getShortcutStr("file.save"), icon: "💾" },
      { commandId: "format.bold", label: "B", shortcut: this.getShortcutStr("format.bold"), icon: "B" },
      { commandId: "format.italic", label: "I", shortcut: this.getShortcutStr("format.italic"), icon: "I" },
      { commandId: "format.link", label: "Link", shortcut: this.getShortcutStr("format.link"), icon: "🔗" },
      { commandId: "settings.open", label: "Settings", shortcut: this.getShortcutStr("settings.open"), icon: "⚙" },
    ];

    for (const btn of buttons) {
      const el = document.createElement("button");
      el.className = "toolbar-btn";
      el.title = `${btn.label} (${btn.shortcut})`;
      el.textContent = btn.icon;
      el.addEventListener("click", () => {
        runCommand(btn.commandId as never, this.context);
      });
      this.toolbarEl.appendChild(el);
    }

    // Separator
    const sep = document.createElement("span");
    sep.className = "toolbar-separator";
    this.toolbarEl.appendChild(sep);

    // Source toggle
    this.sourceToggleEl = document.createElement("button");
    this.sourceToggleEl.className = "toolbar-btn source-toggle";
    this.sourceToggleEl.title = `Source Mode (${this.getShortcutStr("view.toggleSourceMode")})`;
    this.sourceToggleEl.textContent = "Source";
    this.sourceToggleEl.addEventListener("click", () => {
      runCommand("view.toggleSourceMode", this.context);
    });
    this.updateSourceToggle();
    this.toolbarEl.appendChild(this.sourceToggleEl);

    this.container.appendChild(this.toolbarEl);
  }

  private getShortcutStr(commandId: string): string {
    const prefs = getPreferences();
    const bindings = prefs.shortcuts[commandId];
    if (bindings && bindings.length > 0) {
      return shortcutToString(bindings[0]);
    }
    return "";
  }

  private updateSourceToggle(): void {
    if (!this.sourceToggleEl) return;
    const doc = getDocument();
    if (doc.mode === "source") {
      this.sourceToggleEl.classList.add("active");
    } else {
      this.sourceToggleEl.classList.remove("active");
    }
  }

  // UiController implementation
  showToolbar(visible: boolean): void {
    this.visible = visible;
    if (this.toolbarEl) {
      this.toolbarEl.classList.toggle("hidden", !visible);
    }
  }
  showStatusBar(): void {}
  showFindBox(): void {}
  hideFindBox(): void {}
  showSettings(): void {}
  hideSettings(): void {}
  showAbout(): void {}
  hideAbout(): void {}
  updateToolbar(): void {
    this.updateSourceToggle();
  }
  updateStatusBar(): void {}
  updateTitle(): void {}
}
