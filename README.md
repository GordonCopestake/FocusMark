# FocusMark

A minimal cross-platform Markdown block editor.

Like a Markdown viewer where the current block instantly becomes Notepad.

## What FocusMark Is

- A fast, small Markdown editor for Windows, macOS and Linux
- Block-based editing: click a rendered block to edit raw Markdown in-place
- Full raw source mode available as a reliable fallback
- Keyboard-first operation with configurable shortcuts
- File-based: open, edit, save `.md` files directly

## What FocusMark Is Not

- A note database or knowledge management system
- A full IDE for Markdown
- A rich-text editor
- A publishing platform
- A plugin host (no plugin system in v1)
- Cloud-synced, account-based, or telemetry-enabled

## Markdown Support

- CommonMark core
- GFM extensions: tables, task lists, strikethrough, fenced code blocks, autolinks
- Preserves your source formatting — never auto-formats
- Safe HTML rendering (scripts are sanitized)

## Supported Platforms

- Windows 10/11 x64
- macOS (Apple Silicon and Intel)
- Linux desktop (AppImage)

## Development

### Prerequisites

- Node.js 18+
- Rust (for Tauri backend)
- Platform build dependencies for Tauri v2

### Setup

```bash
npm install
```

### Run (web-only frontend dev)

```bash
npm run dev
```

### Run (full Tauri app)

```bash
npm run tauri:dev
```

### Build

```bash
npm run tauri:build
```

## Architecture

```
src/
  app/         App controller, state, preferences, commands, types
  editor/      CodeMirror editors (source mode, block editor)
  markdown/    Parser, renderer, sanitizer, block model
  file/        File operations, line endings, recent files
  ui/          Toolbar, status bar, find box, settings, dialogs
  styles/      CSS: base, themes, markdown, editor
  main.ts      Entry point
src-tauri/
  src/         Rust backend: file commands, preferences, app events
```

## Known Limitations (v1)

- No multi-window editing
- No find-and-replace (find only)
- No export to PDF
- No Mermaid or math rendering
- No mobile support
- No cloud sync or accounts

## License

MIT
