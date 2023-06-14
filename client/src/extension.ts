/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { ExtensionContext, window, workspace, Uri, commands } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { H5PEditorPanel } from './app/models/H5PEditorPanel';
import { AsyncEvent } from './app/models/AsyncEvent';

let client: LanguageClient;

export function getRootPathUri(): Uri | null {
  const maybeWorkspace = workspace.workspaceFolders;
  const rootPath = maybeWorkspace != null ? maybeWorkspace[0] : null;
  return rootPath != null ? rootPath.uri : null;
}

export async function activate(context: ExtensionContext) {
  console.log('Activating extension');
  const serverReadyEvent = new AsyncEvent();
  const h5pEditor = new H5PEditorPanel(context);
  context.subscriptions.push(
    commands.registerCommand('h5p.web.showEditor', () => {
      context.subscriptions.push(
        window.setStatusBarMessage(
          'H5P Editor: Loading $(sync~spin)',
          serverReadyEvent.wait()
        )
      );
      serverReadyEvent.wait().then(() => {
        h5pEditor.revealOrNew();
      });
    })
  );

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ['--nolazy', '--inspect=16009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [],
    synchronize: {},
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    serverOptions,
    clientOptions
  );

  client.start();
  context.subscriptions.push(
    client.onNotification('server-ready', () => {
      serverReadyEvent.set();
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
