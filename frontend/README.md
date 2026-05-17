# CP Debugger VS Code Extension

This folder contains the VS Code extension that replaces the browser-based frontend.

## Quick start

1. Install dependencies:
   ```
   npm install
   ```
2. Build the extension:
   ```
   npm run build
   ```
3. Launch the extension in VS Code using the Extension Development Host.

## Configuration

- `cpDebugger.mode`: `file` (default) or `http`.
- `cpDebugger.sessionFile`: file path to the debug output JSON.
- `cpDebugger.httpEndpoint`: HTTP endpoint for debug sessions (http mode).
- `cpDebugger.autoRefresh`: auto-refresh data.
- `cpDebugger.pollIntervalMs`: polling interval for http mode.

## Notes

- The legacy Next.js frontend is preserved in `frontend-legacy/`.
- The extension UI is optimized for the VS Code sidebar and panel layout.
