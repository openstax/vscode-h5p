# Contributing

## Getting started

```bash
pnpm install
pnpm build:app
pnpm watch
```

- `pnpm build:app` builds the front-end app (i.e. the H5P viewer) with
  [Vite](https://vitejs.dev/).
- `pnpm watch` compiles the extension code with `tsc` in watch mode.

Once watch mode is running, press <kbd>F5</kbd> to **run the extension in debug
mode** in a new VS Code window. If this doesn't work, check that the
[_JavaScript Debugger_](https://marketplace.visualstudio.com/items?itemName=ms-vscode.js-debug)
extension is enabled.

Whenever you change the code of the front-end app, run `pnpm build:app` again in
a separate terminal, wait for Vite to finish building the app, and reload the VS
Code window where the extension is running with <kbd>Ctrl+R</kbd>.