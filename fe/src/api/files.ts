import { api } from './api';
import { TaskFile, FileUploadOptions } from '../types/file';
import { AxiosProgressEvent } from 'axios';

// Get task files
export const getTaskFiles = async (
  taskId: number,
  signal?: AbortSignal,
): Promise<TaskFile[]> => {
  const response = await api.get<TaskFile[]>(`/files`, {
    params: { taskId: taskId.toString() },
    signal,
  });
  return response.data;
};

// Upload file
export const uploadFile = async (
  taskId: number,
  formData: FormData,
  onProgress?: (progressEvent: AxiosProgressEvent) => void,
): Promise<TaskFile> => {
  const options: FileUploadOptions = {
    onUploadProgress: onProgress,
    params: {
      taskId: taskId.toString(),
    },
  };

  const response = await api.post<TaskFile>('/files', formData, options);
  return response.data;
};

// Download file
export const downloadFile = async (
  taskId: number,
  fileId: number,
): Promise<void> => {
  const response = await api.get<Blob>(`/files/${fileId}/download`, {
    params: { taskId: taskId.toString() },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;

  const contentDisposition = response.headers['content-disposition'];
  const filename = contentDisposition
    ? decodeURIComponent(
        contentDisposition.split('filename=')[1].replace(/['"]/g, ''),
      )
    : 'download';

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Delete file
export const deleteFile = async (
  taskId: number,
  fileId: number,
): Promise<void> => {
  await api.delete<void>(`/files/${fileId}`, {
    params: { taskId: taskId.toString() },
  });
};
