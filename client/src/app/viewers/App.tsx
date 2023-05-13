import { Suspense, useEffect, useState } from 'react';
import { useEventListener } from '@react-hookz/web';
import { isFileInfoMessage } from '../utils/FileUtils';
import { ErrorBoundary } from 'react-error-boundary';
import { FileInfo, Message } from '../models/FileInfo';
import H5PViewerComponent from './H5PViewerComponent';

function App() {
  const [fileInfo, setFileInfo] = useState<FileInfo>();

  useEventListener(window, 'message', (evt: MessageEvent<Message>) => {
    const { data: message } = evt;
    if (isFileInfoMessage(message)) {
		console.log(`File received ${message.data.uri}`)
      setFileInfo(message.data);
    }
  });

  useEffect(() => {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'ready' });
  }, []);

  if (!fileInfo) {
    return null;
  }

  return (
    <ErrorBoundary fallbackRender={({ error }) => <p>{error.message}</p>}>
      <Suspense fallback={<>Loading...</>}>
    	<H5PViewerComponent h5pUrl="http://localhost:8080" />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
