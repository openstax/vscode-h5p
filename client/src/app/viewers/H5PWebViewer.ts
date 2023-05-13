import {
  CustomDocument,
  CustomReadonlyEditorProvider,
  ExtensionContext,
  Uri,
  Webview,
  WebviewPanel,
  workspace,
} from 'vscode';
import { join, basename } from 'path';
import { postCall } from '../utils/RestUtils';

export default class H5PWebViewer
  implements CustomReadonlyEditorProvider<CustomDocument>
{
  public constructor(private readonly context: ExtensionContext) {}

  public async openCustomDocument(uri: Uri): Promise<CustomDocument> {
    console.log('Opening Document', uri.fsPath);
    await postCall('/vscode-h5p/extract', { fsPath: uri.fsPath }, undefined);
    return {
      uri,
      dispose: () => {
        console.log('Window Disposed!');
      },
    };
  }

  public async resolveCustomEditor(
    document: CustomDocument,
    webviewPanel: WebviewPanel
  ): Promise<void> {
    const { webview } = webviewPanel;

    // Allow opening files outside of workspace
    // https://github.com/ucodkr/vscode-tiff/blob/9a4f976584fcba24e9f25680fcdb47fc8f97493f/src/tiffPreview.ts#L27-L30
    const extensionRoot = Uri.file(this.context.extensionPath);
    const resourceRoot = document.uri.with({
      path: document.uri.path.replace(/\/[^/]+?\.\w+$/, '/'),
    });

    webview.options = {
      enableScripts: true,
      localResourceRoots: [resourceRoot, extensionRoot],
    };
    console.log('Webview Options', webview.options);
    console.log('Webview Uri', webview.asWebviewUri(document.uri).toString(true));
    console.log('Document Uri', document.uri);
    console.log('Generating Webview');
    webview.html = await this.getHtmlForWebview(webview);

    webview.onDidReceiveMessage(async (evt) => {
      if (evt.type === 'ready') {
        const { size } = await workspace.fs.stat(document.uri);
        webview.postMessage({
          type: 'FileInfo',
          data: {
            uri: webview.asWebviewUri(document.uri).toString(),
            name: basename(document.uri.fsPath),
            size,
          },
        });
      }
    });
  }

  private async getHtmlForWebview(webview: Webview): Promise<string> {
    const { extensionPath } = this.context;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const manifest = require(join(
        extensionPath,
        'client',
        'out',
        'manifest.json'
      ));
      console.debug(`Rendering the web page`);

      // get all generated chunks names
      const chunksRegex = /^((?!\.map|\.css|\.html).)*$/;
      const chunkNames = Object.keys(manifest)
        .filter((key) => {
          return chunksRegex.test(manifest[key].file);
        })
        .map((key) => key);
      console.log('Chunk Names', chunkNames);
      const scripts = [...chunkNames]
        .map((scriptName) => {
          const jsUri = webview.asWebviewUri(
            Uri.file(
              join(extensionPath, 'client', 'out', manifest[scriptName].file)
            )
          );
          let output = `<script src="${jsUri}"></script>`;
          if (manifest[scriptName].css !== undefined)
            output += [...manifest[scriptName].css]
              .map(
                (css) =>
                  `<link rel="stylesheet" href=" ${webview.asWebviewUri(
                    Uri.file(join(extensionPath, 'client', 'out', css))
                  )}">`
              )
              .join('');
          return output;
        })
        .join('');
      return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body>
				<div id="root"></div>
				${scripts}
			</body>
			</html>`;
    } catch (e) {
      console.log('Error', e);
      return `Error: ${e}`;
    }
  }
}
