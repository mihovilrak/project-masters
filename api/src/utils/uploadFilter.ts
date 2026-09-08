import path from 'path';
import multer from 'multer';

// Extension -> allowed MIME types. Both halves are checked so a .png claiming
// text/html (or an .html claiming image/png) is rejected; only what the frontend
// actually renders is worth storing and serving back later.
export const ALLOWED_UPLOAD_TYPES: Record<string, string[]> = {
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
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  '.odt': ['application/vnd.oasis.opendocument.text'],
  '.ods': ['application/vnd.oasis.opendocument.spreadsheet'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
};

export const uploadFileFilter: multer.Options['fileFilter'] = (
  req,
  file,
  cb,
) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = ALLOWED_UPLOAD_TYPES[extension];

  if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
    // errorHandler only echoes `message` below status 500, so tag it as a 400
    // to keep the reason visible in production.
    const error = new Error(
      `Unsupported file type: ${extension || file.originalname} (${file.mimetype})`,
    ) as Error & { status?: number };
    error.status = 400;
    cb(error);
    return;
  }

  cb(null, true);
};
