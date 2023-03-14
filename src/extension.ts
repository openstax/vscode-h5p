import { ExtensionContext, window } from 'vscode';
import H5PWebViewer from './H5PWebViewer';
import { startServer } from './H5PWebServer';

const EDITOR_IDS = ['h5p.web.viewer', 'h5p.web.fallback-viewer'];

export function activate(context: ExtensionContext) {
  console.log('activating h5p viewer');
  startServer();
  context.subscriptions.push(
    ...EDITOR_IDS.map((id) =>
      window.registerCustomEditorProvider(id, new H5PWebViewer(context), {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: true,
      })
    )
  );
}
