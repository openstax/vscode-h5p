import { FileInfo, Message } from '../models/FileInfo';

export function isFileInfoMessage(
  message: Message,
): message is Message<FileInfo> {
  return message.type === 'FileInfo';
}
