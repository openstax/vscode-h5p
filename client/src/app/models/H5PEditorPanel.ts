import vscode from 'vscode';
import { Panel } from './Panel';
import path from 'path';
export class H5PEditorPanel extends Panel {

	public get id(): string {
		return 'h5p.web.editor'
	}

  protected createPanel(): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      this.id,
      'H5P Editor',
      this.columnSelector(),
      { retainContextWhenHidden: true }
    );
    const { webview } = panel;
    const extensionRoot = vscode.Uri.file(this.context.extensionPath);
    const resourceRoot = vscode.Uri.file(__dirname);

    webview.options = {
      enableScripts: true,
      localResourceRoots: [resourceRoot, extensionRoot],
    };

		webview.html = getHtmlForWebview(this.context, webview);
		webview.onDidReceiveMessage(async (evt) => {
			if (evt.type === 'ready') {
				webview.postMessage({
					type: 'FileInfo',
					data: { server_url: buildGitpodURL() },
				});
			}
		});

    return panel;
  }
}

function buildGitpodURL() {
  const port = 8080;
  if (process.env['GITPOD_WORKSPACE_ID']) {
    return `https://${port}-${process.env['GITPOD_WORKSPACE_ID']}.${process.env['GITPOD_WORKSPACE_CLUSTER_HOST']}`;
  } else {
    return `http://localhost:${port}`;
  }
}

function getHtmlForWebview(
  context: vscode.ExtensionContext,
  webview: vscode.Webview
): string {
  const { extensionPath } = context;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const manifest = require(path.join(
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
          vscode.Uri.file(
            path.join(extensionPath, 'client', 'out', manifest[scriptName].file)
          )
        );
        let output = `<script src="${jsUri}"></script>`;
        if (manifest[scriptName].css !== undefined)
          output += [...manifest[scriptName].css]
            .map(
              (css) =>
                `<link rel="stylesheet" href=" ${webview.asWebviewUri(
                  vscode.Uri.file(
                    path.join(extensionPath, 'client', 'out', css)
                  )
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
