import type { UiController, ShortcutBinding, CommandContext } from "../app/types";
import {
  getPreferences,
  updatePreferences,
  getShortcuts,
  setShortcut,
  resetShortcut,
  resetAllShortcuts,
  shortcutToString,
  findShortcutConflict,
} from "../app/preferences";
import { commandRegistry } from "../app/commands";

export class SettingsUi implements UiController {
  private overlay: HTMLElement | null = null;

  constructor(_context: CommandContext) {}

  showSettings(): void {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "dialog-overlay";

    const dialog = document.createElement("div");
    dialog.className = "settings-dialog";
    dialog.innerHTML = this.getContent();

    this.overlay.appendChild(dialog);
    document.body.appendChild(this.overlay);

    this.bindEvents(dialog);
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.hideSettings();
    });
  }

  hideSettings(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private getContent(): string {
    const prefs = getPreferences();
    return `
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="settings-close" data-action="close">×</button>
      </div>
      <div class="settings-tabs">
        <button class="settings-tab active" data-tab="appearance">Appearance</button>
        <button class="settings-tab" data-tab="editor">Editor</button>
        <button class="settings-tab" data-tab="shortcuts">Shortcuts</button>
        <button class="settings-tab" data-tab="advanced">Advanced</button>
      </div>
      <div class="settings-body">
        <div class="settings-panel active" id="panel-appearance">
          <h3>Appearance</h3>
          <label class="settings-field">
            Theme
            <select data-setting="theme">
              <option value="system" ${prefs.theme === "system" ? "selected" : ""}>System</option>
              <option value="light" ${prefs.theme === "light" ? "selected" : ""}>Light</option>
              <option value="dark" ${prefs.theme === "dark" ? "selected" : ""}>Dark</option>
            </select>
          </label>
          <label class="settings-field">
            Reader Font Family
            <input type="text" data-setting="readerFontFamily" value="${escapeAttr(prefs.readerFontFamily)}" />
          </label>
          <label class="settings-field">
            Editor Font Family
            <input type="text" data-setting="editorFontFamily" value="${escapeAttr(prefs.editorFontFamily)}" />
          </label>
          <label class="settings-field">
            Font Size
            <input type="number" data-setting="fontSize" min="10" max="32" value="${prefs.fontSize}" />
          </label>
          <label class="settings-field">
            Line Width
            <select data-setting="lineWidth">
              <option value="narrow" ${prefs.lineWidth === "narrow" ? "selected" : ""}>Narrow</option>
              <option value="normal" ${prefs.lineWidth === "normal" ? "selected" : ""}>Normal</option>
              <option value="wide" ${prefs.lineWidth === "wide" ? "selected" : ""}>Wide</option>
            </select>
          </label>
          <label class="settings-field checkbox">
            <input type="checkbox" data-setting="showToolbar" ${prefs.showToolbar ? "checked" : ""} />
            Show Toolbar
          </label>
          <label class="settings-field checkbox">
            <input type="checkbox" data-setting="showStatusBar" ${prefs.showStatusBar ? "checked" : ""} />
            Show Status Bar
          </label>
        </div>

        <div class="settings-panel" id="panel-editor">
          <h3>Editor</h3>
          <label class="settings-field">
            Default Mode
            <select data-setting="defaultMode">
              <option value="rendered" ${prefs.defaultMode === "rendered" ? "selected" : ""}>Rendered</option>
              <option value="source" ${prefs.defaultMode === "source" ? "selected" : ""}>Source</option>
            </select>
          </label>
          <label class="settings-field checkbox">
            <input type="checkbox" data-setting="enableGfm" ${prefs.enableGfm ? "checked" : ""} />
            Enable GFM Extensions
          </label>
          <label class="settings-field checkbox">
            <input type="checkbox" data-setting="remoteImagesEnabled" ${prefs.remoteImagesEnabled ? "checked" : ""} />
            Enable Remote Images
          </label>
          <label class="settings-field">
            Raw HTML Handling
            <select data-setting="htmlHandling">
              <option value="sanitize" ${prefs.htmlHandling !== "escape" ? "selected" : ""}>Sanitise (via DOMPurify)</option>
              <option value="escape" ${prefs.htmlHandling === "escape" ? "selected" : ""}>Escape Raw HTML</option>
            </select>
          </label>
        </div>

        <div class="settings-panel" id="panel-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <div class="shortcuts-search">
            <input type="text" id="shortcut-search" placeholder="Search shortcuts..." />
          </div>
          <div class="shortcuts-list" id="shortcuts-list">
            ${this.getShortcutsListHtml()}
          </div>
          <div class="shortcuts-footer">
            <button class="dialog-btn" id="reset-all-shortcuts">Reset All to Defaults</button>
          </div>
        </div>

        <div class="settings-panel" id="panel-advanced">
          <h3>Advanced</h3>
          <p class="settings-note">Preferences are stored locally on your machine.</p>
          <button class="dialog-btn" id="clear-recent-files">Clear Recent Files</button>
        </div>
      </div>
    `;
  }

  private getShortcutsListHtml(): string {
    const shortcuts = getShortcuts();
    const grouped = new Map<string, typeof commandRegistry>();
    for (const cmd of commandRegistry) {
      const group = grouped.get(cmd.category) || [];
      group.push(cmd);
      grouped.set(cmd.category, group);
    }

    let html = "";
    for (const [category, cmds] of grouped) {
      html += `<div class="shortcut-category">
        <h4>${category}</h4>`;
      for (const cmd of cmds) {
        const binding = shortcuts[cmd.id] || [];
        const display = binding.length > 0
          ? binding.map(shortcutToString).join(", ")
          : '<span class="unassigned">Unassigned</span>';
        html += `
          <div class="shortcut-row" data-command="${cmd.id}">
            <span class="shortcut-label">${cmd.label}</span>
            <span class="shortcut-binding">${display}</span>
            <button class="shortcut-reset" data-reset="${cmd.id}">Reset</button>
          </div>`;
      }
      html += `</div>`;
    }
    return html;
  }

  private bindEvents(dialog: HTMLElement): void {
    // Close button
    dialog.querySelector('[data-action="close"]')?.addEventListener("click", () => {
      this.hideSettings();
    });

    // Tab switching
    dialog.querySelectorAll(".settings-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = (tab as HTMLElement).dataset.tab;
        dialog.querySelectorAll(".settings-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        dialog.querySelectorAll(".settings-panel").forEach((p) => p.classList.remove("active"));
        const panel = dialog.querySelector(`#panel-${tabName}`);
        if (panel) panel.classList.add("active");
      });
    });

    // Settings value changes
    dialog.querySelectorAll("[data-setting]").forEach((el) => {
      const setting = (el as HTMLElement).dataset.setting!;
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.addEventListener("change", () => {
          updatePreferences({ [setting]: el.checked } as never);
        });
      } else {
        el.addEventListener("change", () => {
          const value = (el as HTMLInputElement | HTMLSelectElement).value;
          updatePreferences({ [setting]: isNaN(Number(value)) ? value : Number(value) } as never);
        });
      }
    });

    // Shortcut search
    const searchInput = dialog.querySelector("#shortcut-search") as HTMLInputElement;
    searchInput?.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      dialog.querySelectorAll(".shortcut-row").forEach((row) => {
        const label = (row.querySelector(".shortcut-label") as HTMLElement)
          ?.textContent?.toLowerCase() || "";
        (row as HTMLElement).style.display = label.includes(query) ? "" : "none";
      });
    });

    // Shortcut row click to reassign
    dialog.querySelectorAll(".shortcut-row").forEach((row) => {
      const bindingEl = row.querySelector(".shortcut-binding") as HTMLElement;
      const commandId = (row as HTMLElement).dataset.command!;
      bindingEl?.addEventListener("click", () => {
        this.startShortcutCapture(bindingEl, commandId, dialog);
      });
    });

    // Reset individual shortcut
    dialog.querySelectorAll("[data-reset]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const commandId = (btn as HTMLElement).dataset.reset!;
        resetShortcut(commandId);
        // Refresh shortcuts panel
        const list = dialog.querySelector("#shortcuts-list");
        if (list) list.innerHTML = this.getShortcutsListHtml();
        this.bindEvents(dialog);
      });
    });

    // Reset all shortcuts
    dialog.querySelector("#reset-all-shortcuts")?.addEventListener("click", () => {
      resetAllShortcuts();
      const list = dialog.querySelector("#shortcuts-list");
      if (list) list.innerHTML = this.getShortcutsListHtml();
      this.bindEvents(dialog);
    });

    // Clear recent files
    dialog.querySelector("#clear-recent-files")?.addEventListener("click", async () => {
      const { clearRecentFiles } = await import("../file/recentFiles");
      clearRecentFiles();
    });
  }

  private startShortcutCapture(
    element: HTMLElement,
    commandId: string,
    _dialog: HTMLElement
  ): void {
    const original = element.textContent || "";
    element.textContent = "Press keys...";
    element.classList.add("capturing");

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const binding: ShortcutBinding = {
        key: e.key,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      };

      // Check for conflict
      const conflict = findShortcutConflict(
        commandId as never,
        binding,
        getShortcuts()
      );

      if (conflict && conflict !== commandId) {
        const confirmReplace = confirm(
          `${shortcutToString(binding)} is already assigned to "${conflict}".\nReplace it?`
        );
        if (!confirmReplace) {
          element.textContent = original;
          element.classList.remove("capturing");
          document.removeEventListener("keydown", handler, true);
          return;
        }
        setShortcut(conflict, []);
      }

      setShortcut(commandId, [binding]);
      element.textContent = shortcutToString(binding);
      element.classList.remove("capturing");
      document.removeEventListener("keydown", handler, true);
    };

    document.addEventListener("keydown", handler, true);
  }

  // UiController stubs
  showToolbar(): void {}
  showStatusBar(): void {}
  showFindBox(): void {}
  hideFindBox(): void {}
  showAbout(): void {}
  hideAbout(): void {}
  updateToolbar(): void {}
  updateStatusBar(): void {}
  updateTitle(): void {}
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
