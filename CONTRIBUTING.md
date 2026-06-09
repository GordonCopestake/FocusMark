# Contributing to FocusMark

## Development Setup

1. Install Node.js 18+ and Rust
2. `npm install`
3. `npm run tauri:dev` for full app development
4. `npm run dev` for frontend-only development

## Architecture

- `src/app/` — Application controller, state management, command registry
- `src/editor/` — CodeMirror 6 editor implementations
- `src/markdown/` — Markdown parsing (remark-parse), rendering (markdown-it), sanitization (DOMPurify)
- `src/file/` — File operations, line endings, recent files
- `src/ui/` — UI components (toolbar, status bar, settings, find)
- `src/styles/` — CSS
- `src-tauri/` — Rust backend

## Code Style

- Plain TypeScript, no frameworks
- All commands route through the central command registry
- Keep it simple and predictable
- No auto-formatting of user Markdown

## Testing

```bash
npm run tauri:dev    # Run the app
npx tsc --noEmit     # Type check
```

## Pull Requests

- Keep changes focused and minimal
- Ensure `npx tsc --noEmit` passes
- No telemetry or account requirements
