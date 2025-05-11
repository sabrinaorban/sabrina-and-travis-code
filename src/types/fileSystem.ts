
import { FileEntry, FileSystemState } from './index';

export interface FileSystemContextType {
  fileSystem: FileSystemState;
  createFile: (path: string, name: string, content?: string) => Promise<void>;
  createFolder: (path: string, name: string) => Promise<void>;
  updateFile: (id: string, content: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  selectFile: (file: FileEntry | null) => void;
  getFileByPath: (path: string) => FileEntry | null;
  getFileContentByPath: (path: string) => string | null;
  updateFileByPath: (path: string, content: string) => Promise<void>;
  isLoading: boolean;
  refreshFiles: () => Promise<void>;
  deleteAllFiles: () => Promise<void>;
  getModifiedFiles: () => FileEntry[];
}
