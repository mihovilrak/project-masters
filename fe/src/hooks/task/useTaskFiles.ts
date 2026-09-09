import { useAsyncResource } from '../common/useAsyncResource';
import { TaskFile } from '../../types/file';
import { getTaskFiles, uploadFile, deleteFile } from '../../api/files';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

const EMPTY_FILES: TaskFile[] = [];

export const useTaskFiles = (taskId: string) => {
  const {
    data: files,
    setData: setFiles,
    refetch: refreshFiles,
  } = useAsyncResource<TaskFile[]>(
    async (signal) => (await getTaskFiles(Number(taskId), signal)) || [],
    [taskId],
    {
      initialData: EMPTY_FILES,
      enabled: Boolean(taskId),
      errorMessage: 'Failed to fetch files',
    },
  );

  const handleFileUpload = async (file: File) => {
    try {
      if (!taskId) throw new Error('Task ID is required');
      if (!file) throw new Error('File is required');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('task_id', taskId);

      const uploadedFile = await uploadFile(Number(taskId), formData);
      if (!uploadedFile) {
        throw new Error('Failed to upload file');
      }
      await refreshFiles();
      return uploadedFile;
    } catch (error: unknown) {
      logger.error('Failed to upload file:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to upload file'));
    }
  };

  const handleFileDelete = async (fileId: number) => {
    try {
      if (!taskId) throw new Error('Task ID is required');
      if (!fileId) throw new Error('File ID is required');

      await deleteFile(Number(taskId), fileId);
      setFiles((prev) => prev.filter((file) => file?.id !== fileId));
    } catch (error: unknown) {
      logger.error('Failed to delete file:', error);
      throw new Error(getApiErrorMessage(error, 'Failed to delete file'));
    }
  };

  return {
    files,
    handleFileUpload,
    handleFileDelete,
    refreshFiles,
  };
};
