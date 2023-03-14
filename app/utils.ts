import { FileInfo, Message } from './models';
import fsExtra from 'fs-extra';
import os from 'os';

// 2 GB = 2 * 1024 * 1024 * 1024 B
export const MAX_SIZE_IN_BYTES = 2147483648;

export function isFileInfoMessage(
  message: Message
): message is Message<FileInfo> {
  return message.type === 'FileInfo';
}

/**
 * This method will delete all temporary uploaded files from the request
 */
export async function clearTempFiles(
  req: Request & { files: any }
): Promise<void> {
  if (!req.files) {
    return;
  }

  await Promise.all(
    Object.keys(req.files).map((file) =>
      req.files[file].tempFilePath !== undefined &&
      req.files[file].tempFilePath !== ''
        ? fsExtra.remove(req.files[file].tempFilePath)
        : Promise.resolve()
    )
  );
}
