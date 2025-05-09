
import { FileEntry, FileSystemState } from '../types';

export interface FileSystemContextType {
  fileSystem: FileSystemState;
  createFile: (path: string, name: string, content?: string) => Promise<void>;
  createFolder: (path: string, name: string) => Promise<void>;
  updateFile: (id: string, content: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  deleteAllFiles: () => Promise<void>; // Added this method
  selectFile: (file: FileEntry | null) => void;
  getFileByPath: (path: string) => FileEntry | null;
  isLoading: boolean;
  refreshFiles: () => Promise<void>;
}
