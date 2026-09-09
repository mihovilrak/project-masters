import path from 'path';

// The bundled API runs from /app/api, so a __dirname-relative default lands
// outside the mounted volume. UPLOADS_DIR is set to /app/uploads in the image.
export const UPLOADS_DIR = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'),
);
