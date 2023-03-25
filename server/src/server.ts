/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { connect } from 'http2';
import {
  createConnection,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
} from 'vscode-languageserver/node';

import { prepareEnvironment, startH5P } from './createH5PServer';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

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
      console.log('Preparing environment for server');
      await prepareEnvironment().then(async (e) => {
        console.log('Environment prepared');
        await startH5P().then((e) => {
          console.log('Starting server');
        });
      });
    }
  };
  inner().catch((e) => {
    throw e;
  });
});

// Listen on the connection
connection.listen();
