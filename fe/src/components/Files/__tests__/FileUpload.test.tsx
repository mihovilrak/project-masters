import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUpload from '../FileUpload';
import { useFileUpload } from '../../../hooks/file/useFileUpload';
import { UPLOAD_ACCEPT } from '../../../constants/uploads';

// Mock the useFileUpload hook
jest.mock('../../../hooks/file/useFileUpload');
const mockUseFileUpload = useFileUpload as jest.Mock;

const defaultProps = {
  taskId: 1,
  onFileUploaded: jest.fn(),
};

const renderFileUpload = (props = {}) => {
  return render(<FileUpload {...defaultProps} {...props} />);
};

describe('FileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    mockUseFileUpload.mockImplementation(() => ({
      uploading: false,
      progress: 0,
      error: null,
      handleFileChange: jest.fn(),
      setError: jest.fn(),
    }));
  });

  it('renders upload button', () => {
    renderFileUpload();
    expect(screen.getByText('Upload File')).toBeInTheDocument();
  });

  it('has hidden file input', () => {
    renderFileUpload();
    const fileInput = screen.getByTestId('file-input');
    expect(fileInput).toHaveStyle({ display: 'none' });
    expect(fileInput).toHaveAttribute('accept', UPLOAD_ACCEPT);
  });

  it('clicks file input when upload button is clicked', () => {
    renderFileUpload();
    const fileInput = screen.getByTestId('file-input');
    const clickSpy = jest.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByText('Upload File'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('shows progress bar when uploading', () => {
    mockUseFileUpload.mockImplementation(() => ({
      uploading: true,
      progress: 45,
      error: null,
      handleFileChange: jest.fn(),
      setError: jest.fn(),
    }));

    renderFileUpload();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows error alert when there is an error', () => {
    mockUseFileUpload.mockImplementation(() => ({
      uploading: false,
      progress: 0,
      error: 'Upload failed',
      handleFileChange: jest.fn(),
      setError: jest.fn(),
    }));

    renderFileUpload();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('handles file selection', () => {
    const mockHandleFileChange = jest.fn();
    mockUseFileUpload.mockImplementation(() => ({
      uploading: false,
      progress: 0,
      error: null,
      handleFileChange: mockHandleFileChange,
      setError: jest.fn(),
    }));

    renderFileUpload();
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockHandleFileChange).toHaveBeenCalled();
  });

  it('disables upload button while uploading', () => {
    mockUseFileUpload.mockImplementation(() => ({
      uploading: true,
      progress: 0,
      error: null,
      handleFileChange: jest.fn(),
      setError: jest.fn(),
    }));

    renderFileUpload();
    expect(screen.getByText('Upload File')).toBeDisabled();
  });

  it('allows error to be dismissed', () => {
    const mockSetError = jest.fn();
    mockUseFileUpload.mockImplementation(() => ({
      uploading: false,
      progress: 0,
      error: 'Upload failed',
      handleFileChange: jest.fn(),
      setError: mockSetError,
    }));

    renderFileUpload();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockSetError).toHaveBeenCalledWith(null);
  });

  it('shows correct progress percentage', () => {
    mockUseFileUpload.mockImplementation(() => ({
      uploading: true,
      progress: 75,
      error: null,
      handleFileChange: jest.fn(),
      setError: jest.fn(),
    }));

    renderFileUpload();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
