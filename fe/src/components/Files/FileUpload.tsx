import React, { useRef } from 'react';
import { Button, Box, LinearProgress, Typography, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useFileUpload } from '../../hooks/file/useFileUpload';
import { FileUploadProps } from '../../types/file';
import { UPLOAD_ACCEPT } from '../../constants/uploads';

const FileUpload: React.FC<FileUploadProps> = ({ taskId, onFileUploaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, error, handleFileChange, setError } =
    useFileUpload(taskId, onFileUploaded);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="file-input"
        accept={UPLOAD_ACCEPT}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleClick}
        disabled={uploading}
        startIcon={<CloudUploadIcon />}
        sx={{ mb: 2 }}
      >
        Upload File
      </Button>

      {uploading && (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="text.secondary" align="center">
            {progress}%
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload;
