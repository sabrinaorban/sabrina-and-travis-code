
import { useCreateFile } from './useCreateFile';
import { useCreateFolder } from './useCreateFolder';

export const useFileCreate = (user: any, refreshFiles: () => Promise<void>, toast: any) => {
  const { createFile } = useCreateFile(user, refreshFiles, toast);
  const { createFolder } = useCreateFolder(user, refreshFiles, toast);

  return { createFile, createFolder };
};
