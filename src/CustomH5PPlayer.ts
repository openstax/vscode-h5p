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
import fsExtra from 'fs-extra';
import fs from 'fs';
import unzip from 'unzip-stream';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export default class H5PWebViewer
  implements CustomReadonlyEditorProvider<CustomDocument>
{
  viewerId = uuidv4();
  public constructor(private readonly context: ExtensionContext) {}

  public async openCustomDocument(uri: Uri): Promise<CustomDocument> {
    return { uri: uri, dispose: () => this.dispose() };
  }

  public async resolveCustomEditor(
    document: CustomDocument,
    webviewPanel: WebviewPanel
  ): Promise<void> {
    const extratedPath = await this.extractArchive(document.uri);
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
    const { cspSource } = webview;

    const manifest = require(join(extensionPath, 'dist/manifest.json'));
    const { file: jsPath, css } = manifest['index.html'];
    const [cssPath] = css;

    const jsPathOnDisk = Uri.file(join(extensionPath, 'dist', jsPath));
    const cssPathOnDisk = Uri.file(join(extensionPath, 'dist', cssPath));

    const h5PMainJsUri = webview.asWebviewUri(Uri.file(join(extensionPath, 'dist/assets/h5p/main.bundle.js')));
    const h5PFrameJsUri = webview.asWebviewUri(Uri.file(join(extensionPath, 'dist/assets/h5p/frame.bundle.js')));
    const h5PCssUri = webview.asWebviewUri(Uri.file(join(extensionPath, 'dist/assets/h5p/h5p.css')));

    const jsUri = webview.asWebviewUri(jsPathOnDisk);
    const cssUri = webview.asWebviewUri(cssPathOnDisk);

    const h5pPath = this.getExtractionFolder();

    return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>H5P Web Viewer</title>
        <link rel="stylesheet" href="${cssUri}">
        <link rel="stylesheet" href="${h5PCssUri}">
			</head>
			<body>
				<div id="root"></div>
        <script type="module" src="${jsUri}"></script>
        <script type="module" src="${h5PMainJsUri}"></script>
        <script type="module" src="${h5PFrameJsUri}"></script>
        <script type="text/javascript">
          const el = document.getElementById("h5p-container");
          const options = {
            h5pJsonPath: "${h5pPath}",
            frameJs: "assets/h5p/frame.bundle.js",
            frameCss: "assets/h5p/h5p.css",}",
          };
          new H5PStandalone.H5P(el, options);
        </script>
			</body>
			</html>`;
  }
  public getExtractionFolder(): string {
    let path = `${os.tmpdir()}/h5p_modules/${this.viewerId}`;
    fs.access(path, function (err: any) {
      if (err && err.code === 'ENOENT') {
        fs.mkdirSync(path, { recursive: true });
      }
    });
    console.log(`Extraction folder: ${path}`);
    return path;
  }

  public async extractArchive(uri: Uri): Promise<void> {
    let extractionPath = this.getExtractionFolder();
    console.log(`Extracting file ${uri.fsPath}`);
    fsExtra
      .createReadStream(uri.fsPath)
      .pipe(unzip.Extract({ path: extractionPath }));
  }
  public async dispose() {
    let extractionPath = this.getExtractionFolder();
    console.log(`Cleaning extraction folder!`);
    fs.rmSync(extractionPath, { recursive: true, force: true });
    console.log('Window disposed');
  }
}
