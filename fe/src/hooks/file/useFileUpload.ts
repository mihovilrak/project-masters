import { useState } from 'react';
import { uploadFile } from '../../api/files';
import { TaskFile } from '../../types/file';
import { AxiosProgressEvent } from 'axios';
import { validateUploadFile } from '../../constants/uploads';

export const useFileUpload = (
  taskId: number,
  onFileUploaded: (file: TaskFile) => void,
) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.target;
    const selectedFile = input.files?.[0];
    if (!selectedFile) return;

    try {
      setError(null);
      const validationError = validateUploadFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const progressCallback = (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setProgress(percentage);
        }
      };

      const response = await uploadFile(taskId, formData, progressCallback);
      if (response) {
        onFileUploaded(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      setProgress(0);
      input.value = '';
    }
  };

  return {
    uploading,
    progress,
    error,
    handleFileChange,
    setError,
  };
};
