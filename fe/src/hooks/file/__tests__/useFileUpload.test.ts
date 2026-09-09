import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileUpload } from '../useFileUpload';
import { uploadFile } from '../../../api/files';
import { TaskFile } from '../../../types/file';
import { AxiosProgressEvent } from 'axios';
import { MAX_UPLOAD_SIZE_BYTES } from '../../../constants/uploads';

// Mock the uploadFile function
jest.mock('../../../api/files');
const mockedUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>;

describe('useFileUpload', () => {
  const mockTaskId = 1;
  const mockOnFileUploaded = jest.fn();
  const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
  const mockEvent = {
    target: {
      files: [mockFile],
      value: 'test.txt',
    },
  } as unknown as React.ChangeEvent<HTMLInputElement>;

  const mockTaskFile: TaskFile = {
    id: 1,
    task_id: 1,
    user_id: 1,
    name: 'test.txt',
    original_name: 'test.txt',
    mime_type: 'text/plain',
    size: 4,
    uploaded_on: '2023-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEvent.target.value = 'test.txt';
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useFileUpload(mockTaskId, mockOnFileUploaded),
    );

    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should handle successful file upload', async () => {
    mockedUploadFile.mockResolvedValueOnce(mockTaskFile);

    const { result } = renderHook(() =>
      useFileUpload(mockTaskId, mockOnFileUploaded),
    );

    await act(async () => {
      await result.current.handleFileChange(mockEvent);
    });

    expect(mockedUploadFile).toHaveBeenCalled();
    expect(mockOnFileUploaded).toHaveBeenCalledWith(mockTaskFile);
    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should handle upload progress', async () => {
    let progressCallbackRef: ((e: AxiosProgressEvent) => void) | undefined;
    let resolveUpload: (() => void) | undefined;
    const uploadPromise = new Promise<TaskFile>((resolve) => {
      resolveUpload = () => resolve(mockTaskFile);
    });

    mockedUploadFile.mockImplementation(async (_, __, onProgress) => {
      progressCallbackRef = onProgress;
      return uploadPromise;
    });

    const { result } = renderHook(() =>
      useFileUpload(mockTaskId, mockOnFileUploaded),
    );

    // Start the upload (do not await yet)
    const uploadTask = result.current.handleFileChange(mockEvent);

    // Simulate progress event inside act
    await act(async () => {
      progressCallbackRef?.({ loaded: 50, total: 100 } as AxiosProgressEvent);
    });

    // Wait for progress to update
    await waitFor(() => {
      expect(result.current.progress).toBe(50);
    });

    // Complete the upload
    await act(async () => {
      if (resolveUpload) resolveUpload();
      await uploadTask;
    });
  });

  it('should handle upload error', async () => {
    const errorMessage = 'Upload failed';
    mockedUploadFile.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() =>
      useFileUpload(mockTaskId, mockOnFileUploaded),
    );

    await act(async () => {
      await result.current.handleFileChange(mockEvent);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.uploading).toBe(false);
    expect(mockOnFileUploaded).not.toHaveBeenCalled();
    expect(mockEvent.target.value).toBe('');
  });

  it('rejects files larger than 10 MB before upload', async () => {
    const oversizedFile = new File(['large'], 'large.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(oversizedFile, 'size', {
      value: MAX_UPLOAD_SIZE_BYTES + 1,
    });
    const oversizedEvent = {
      target: { files: [oversizedFile], value: 'large.pdf' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    const { result } = renderHook(() =>
      useFileUpload(mockTaskId, mockOnFileUploaded),
    );

    await act(async () => {
      await result.current.handleFileChange(oversizedEvent);
    });

    expect(result.current.error).toBe('File size must not exceed 10 MB');
    expect(mockedUploadFile).not.toHaveBeenCalled();
    expect(oversizedEvent.target.value).toBe('');
  });

  it('rejects unsupported extensions and MIME types before upload', async () => {
    const invalidFile = new File(['binary'], 'program.exe', {
      type: 'application/x-msdownload',
    });
    const invalidEvent = {
      target: { files: [invalidFile], value: 'program.exe' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    const { result } = renderHook(() =>
      useFileUpload(mockTaskId, mockOnFileUploaded),
    );

    await act(async () => {
      await result.current.handleFileChange(invalidEvent);
    });

    expect(result.current.error).toBe('Unsupported file type: .exe');
    expect(mockedUploadFile).not.toHaveBeenCalled();
    expect(invalidEvent.target.value).toBe('');
  });

  it('should handle empty file selection', async () => {
    const emptyEvent = {
      target: { files: null },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    const { result } = renderHook(() =>
      useFileUpload(mockTaskId, mockOnFileUploaded),
    );

    await act(async () => {
      await result.current.handleFileChange(emptyEvent);
    });

    expect(mockedUploadFile).not.toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  it('should allow manual error state reset', () => {
    const { result } = renderHook(() =>
      useFileUpload(mockTaskId, mockOnFileUploaded),
    );

    act(() => {
      result.current.setError('test error');
    });
    expect(result.current.error).toBe('test error');

    act(() => {
      result.current.setError(null);
    });
    expect(result.current.error).toBeNull();
  });
});
