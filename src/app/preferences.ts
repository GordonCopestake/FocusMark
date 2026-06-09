import type {
  Preferences,
  PreferencesFile,
  ShortcutMap,
  ShortcutBinding,
  CommandId,
} from "./types";
import { platform } from "./platform";

export const defaultShortcutMap: ShortcutMap = {
  "file.new": [{ key: "N", ctrl: true, meta: true }],
  "file.open": [{ key: "O", ctrl: true, meta: true }],
  "file.save": [{ key: "S", ctrl: true, meta: true }],
  "file.saveAs": [{ key: "S", ctrl: true, shift: true, meta: true }],
  "file.close": [{ key: "W", ctrl: true, meta: true }],
  "app.quit": [{ key: "Q", ctrl: true, meta: true }],
  "edit.undo": [{ key: "Z", ctrl: true, meta: true }],
  "edit.redo": [
    { key: "Y", ctrl: true },
    { key: "Z", meta: true, shift: true },
  ],
  "edit.cut": [{ key: "X", ctrl: true, meta: true }],
  "edit.copy": [{ key: "C", ctrl: true, meta: true }],
  "edit.paste": [{ key: "V", ctrl: true, meta: true }],
  "edit.selectAll": [{ key: "A", ctrl: true, meta: true }],
  "edit.find": [{ key: "F", ctrl: true, meta: true }],
  "view.toggleSourceMode": [{ key: "E", ctrl: true, meta: true }],
  "view.increaseFontSize": [{ key: "=", ctrl: true, meta: true }],
  "view.decreaseFontSize": [{ key: "-", ctrl: true, meta: true }],
  "view.resetFontSize": [{ key: "0", ctrl: true, meta: true }],
  "view.toggleToolbar": [{ key: "T", ctrl: true, shift: true, meta: true }],
  "view.toggleStatusBar": [{ key: "B", ctrl: true, shift: true, meta: true }],
  "format.bold": [{ key: "B", ctrl: true, meta: true }],
  "format.italic": [{ key: "I", ctrl: true, meta: true }],
  "format.inlineCode": [{ key: "`", ctrl: true, meta: true }],
  "format.strikethrough": [{ key: "X", ctrl: true, shift: true, meta: true }],
  "format.link": [{ key: "K", ctrl: true, meta: true }],
  "format.heading1": [{ key: "1", ctrl: true, alt: true, meta: true }],
  "format.heading2": [{ key: "2", ctrl: true, alt: true, meta: true }],
  "format.heading3": [{ key: "3", ctrl: true, alt: true, meta: true }],
  "format.bulletList": [{ key: "8", ctrl: true, shift: true, meta: true }],
  "format.numberedList": [{ key: "7", ctrl: true, shift: true, meta: true }],
  "format.taskList": [{ key: "9", ctrl: true, shift: true, meta: true }],
  "format.quote": [{ key: ".", ctrl: true, shift: true, meta: true }],
  "format.codeBlock": [{ key: "C", ctrl: true, alt: true, meta: true }],
  "navigate.nextBlock": [{ key: "ArrowDown", alt: true }],
  "navigate.previousBlock": [{ key: "ArrowUp", alt: true }],
  "navigate.editCurrentBlock": [{ key: "Enter" }],
  "navigate.exitBlock": [{ key: "Escape" }],
  "settings.open": [{ key: ",", ctrl: true, meta: true }],
  "help.about": [],
};

export const defaultPreferences: Preferences = {
  theme: "system",
  fontSize: 16,
  editorFontFamily:
    "ui-monospace, SFMono-Regular, Consolas, Liberation Mono, monospace",
  readerFontFamily:
    "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  lineWidth: "normal",
  showStatusBar: true,
  showToolbar: true,
  defaultMode: "rendered",
  enableGfm: true,
  remoteImagesEnabled: false,
  htmlHandling: "sanitize",
  shortcuts: { ...defaultShortcutMap },
};

let _prefs: Preferences = { ...defaultPreferences };
const prefsListeners: Array<() => void> = [];

export function getPreferences(): Preferences {
  return _prefs;
}

export function setPreferences(prefs: Preferences): void {
  _prefs = prefs;
  notifyPrefs();
}

export function updatePreferences(partial: Partial<Preferences>): void {
  _prefs = { ..._prefs, ...partial };
  notifyPrefs();
  savePreferencesToDisk();
}

export function getShortcuts(): ShortcutMap {
  return _prefs.shortcuts;
}

export function setShortcut(
  commandId: string,
  bindings: ShortcutBinding[]
): void {
  _prefs.shortcuts[commandId] = bindings;
  notifyPrefs();
  savePreferencesToDisk();
}

export function resetShortcut(commandId: string): void {
  const defaults = defaultShortcutMap[commandId];
  if (defaults) {
    _prefs.shortcuts[commandId] = [...defaults];
  }
  notifyPrefs();
  savePreferencesToDisk();
}

export function resetAllShortcuts(): void {
  _prefs.shortcuts = { ...defaultShortcutMap };
  notifyPrefs();
  savePreferencesToDisk();
}

export function subscribePreferences(fn: () => void): () => void {
  prefsListeners.push(fn);
  return () => {
    const idx = prefsListeners.indexOf(fn);
    if (idx !== -1) prefsListeners.splice(idx, 1);
  };
}

function notifyPrefs(): void {
  for (const fn of prefsListeners) fn();
}

function serializePreferences(): PreferencesFile {
  return {
    version: 1,
    preferences: _prefs,
  };
}

function savePreferencesToDisk(): void {
  const data = serializePreferences();
  try {
    localStorage.setItem("focusmark_preferences", JSON.stringify(data));
  } catch {
    // Silently fail for localStorage errors
  }

  // Also persist via Tauri backend if available
  try {
    if (typeof window !== "undefined" && (window as any).__TAURI__) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("save_preferences", { preferences: data }).catch(() => {});
      });
    }
  } catch {
    // Not in Tauri environment
  }
}

export async function loadPreferencesFromTauri(): Promise<Preferences | null> {
  try {
    if (typeof window !== "undefined" && (window as any).__TAURI__) {
      const { invoke } = await import("@tauri-apps/api/core");
      const data = await invoke<PreferencesFile>("load_preferences");
      if (data && data.preferences) {
        return { ...defaultPreferences, ...data.preferences };
      }
    }
  } catch {
    // Backend unavailable
  }
  return null;
}

export function loadPreferencesFromDisk(): Preferences {
  // Try Tauri backend first (async, handled in App init)
  try {
    const raw = localStorage.getItem("focusmark_preferences");
    if (!raw) return { ...defaultPreferences };
    const data: PreferencesFile = JSON.parse(raw);
    if (data.version >= 1 && data.preferences) {
      return { ...defaultPreferences, ...data.preferences };
    }
  } catch {
    // Corrupt preferences, return defaults
  }
  return { ...defaultPreferences };
}

export function shortcutToString(binding: ShortcutBinding): string {
  const parts: string[] = [];
  if (platform.isMac) {
    if (binding.meta) parts.push("Cmd");
    if (binding.ctrl) parts.push("Ctrl");
  } else {
    if (binding.ctrl) parts.push("Ctrl");
  }
  if (binding.alt) parts.push("Alt");
  if (binding.shift) parts.push("Shift");
  parts.push(formatKeyName(binding.key));
  return parts.join("+");
}

function formatKeyName(key: string): string {
  const map: Record<string, string> = {
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    "`": "`",
    ".": ".",
    ",": ",",
    "-": "-",
    "=": "=",
  };
  return map[key] || key.toUpperCase();
}

export function matchShortcut(
  binding: ShortcutBinding,
  event: KeyboardEvent
): boolean {
  const key = event.key;
  // Platform-aware modifier matching:
  // - On Mac: meta=Cmd, ctrl=Ctrl; check whichever the binding specifies
  // - On Windows/Linux: only check ctrl; ignore meta (Windows key shouldn't trigger)
  let wantsMod: boolean;
  let hasMod: boolean;
  if (platform.isMac) {
    wantsMod = (binding.meta ?? false) || (binding.ctrl ?? false);
    hasMod = binding.meta ? event.metaKey : event.ctrlKey;
  } else {
    // On non-Mac, ignore bindings that only specify meta without ctrl
    wantsMod = binding.ctrl ?? false;
    hasMod = event.ctrlKey;
  }
  return (
    key.toLowerCase() === binding.key.toLowerCase() &&
    hasMod === wantsMod &&
    event.altKey === (binding.alt ?? false) &&
    event.shiftKey === (binding.shift ?? false)
  );
}

export function findShortcutConflict(
  commandId: CommandId,
  binding: ShortcutBinding,
  shortcuts: ShortcutMap
): string | null {
  const bindingStr = shortcutToString(binding);
  for (const [id, bindings] of Object.entries(shortcuts)) {
    if (id === commandId) continue;
    for (const b of bindings) {
      if (shortcutToString(b) === bindingStr) {
        return id;
      }
    }
  }
  return null;
}
