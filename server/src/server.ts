/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
} from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import * as fsExtra from 'fs-extra';

import { prepareEnvironment, startH5P } from './createH5PServer';
import Config from './models/OpenStax/config';
import path from 'path';
import { parseBooksXML } from './utils';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

function createRepoConfig(workspaceRoot: string): Config {
  const booksXmlPath = path.join(workspaceRoot, 'META-INF', 'books.xml');
  const { publicRoot, privateRoot } = fsExtra.pathExistsSync(booksXmlPath)
    ? parseBooksXML(booksXmlPath)
    : { publicRoot: 'interactives', privateRoot: 'private' };
  return new Config(workspaceRoot, publicRoot, privateRoot);
}

connection.onInitialize((params: InitializeParams) => {
  connection.console.log('Initializing server');
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {},
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});
connection.onInitialized(() => {
  const inner = async (): Promise<void> => {
    const currentWorkspaces =
      (await connection.workspace.getWorkspaceFolders()) ?? [];
    if (currentWorkspaces.length > 0) {
      // TODO: workspace switching
      const workspaceRoot = URI.parse(currentWorkspaces[0].uri).fsPath;
      const config = createRepoConfig(workspaceRoot);

      console.log('Preparing environment for server');
      await prepareEnvironment(config);
      console.log('Environment prepared');
      console.log('Starting server');
      await startH5P(config);
      connection.sendNotification('server-ready');
    } else {
      /* istanbul ignore next */
      throw new Error('Could not find workspace folder');
    }
  };
  inner().catch((e) => {
    connection.sendNotification('server-error', (e as Error).message);
  });
});

// Listen on the connection
connection.listen();
