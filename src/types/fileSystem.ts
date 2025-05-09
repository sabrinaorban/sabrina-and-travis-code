
import { FileEntry, FileSystemState } from '../types';

export interface FileSystemContextType {
  fileSystem: FileSystemState;
  createFile: (path: string, name: string, content?: string) => Promise<void>;
  createFolder: (path: string, name: string) => Promise<void>;
  updateFile: (id: string, content: string, files?: FileEntry[]) => Promise<void>;
  deleteFile: (id: string, files?: FileEntry[]) => Promise<void>;
  selectFile: (file: FileEntry | null) => void;
  getFileByPath: (path: string, files?: FileEntry[]) => FileEntry | null;
  getFileContentByPath: (path: string, files?: FileEntry[]) => string | null;
  updateFileByPath: (path: string, content: string, files?: FileEntry[]) => Promise<void>;
  isLoading: boolean;
  refreshFiles: () => Promise<FileEntry[] | void>;
  deleteAllFiles: () => Promise<void>;
  getModifiedFiles?: () => FileEntry[];
}
