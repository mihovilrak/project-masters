export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES: Readonly<Record<string, readonly string[]>> =
  {
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
    '.bmp': ['image/bmp'],
    '.pdf': ['application/pdf'],
    '.txt': ['text/plain'],
    '.csv': ['text/csv', 'application/csv', 'text/plain'],
    '.md': ['text/markdown', 'text/x-markdown', 'text/plain'],
    '.json': ['application/json', 'text/plain'],
    '.doc': ['application/msword'],
    '.docx': [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    '.xls': ['application/vnd.ms-excel'],
    '.xlsx': [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    '.ppt': ['application/vnd.ms-powerpoint'],
    '.pptx': [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    '.odt': ['application/vnd.oasis.opendocument.text'],
    '.ods': ['application/vnd.oasis.opendocument.spreadsheet'],
    '.zip': ['application/zip', 'application/x-zip-compressed'],
  };

export const UPLOAD_ACCEPT = Object.keys(ALLOWED_UPLOAD_TYPES).join(',');

export const validateUploadFile = (file: File): string | null => {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return 'File size must not exceed 10 MB';
  }

  const extensionIndex = file.name.lastIndexOf('.');
  const extension =
    extensionIndex >= 0 ? file.name.slice(extensionIndex).toLowerCase() : '';
  const allowedMimeTypes = ALLOWED_UPLOAD_TYPES[extension];
  if (!allowedMimeTypes?.includes(file.type)) {
    return `Unsupported file type: ${extension || file.name}`;
  }

  return null;
};
