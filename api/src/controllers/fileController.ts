import { Request, Response } from 'express';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import * as fileModel from '../models/fileModel';
import { hasPermission } from '../models/permissionModel';
import logger from '../utils/logger';
import { TaskRequest } from '../types/comment';
import { FileUploadRequest } from '../types/file';
import { CustomRequest } from '../types/express';
import { UPLOADS_DIR } from '../utils/uploadsDir';

// Get task files
export const getTaskFiles = async (
  req: TaskRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const taskId = req.taskId || '';
  const files = await fileModel.getTaskFiles(pool, taskId);
  res.status(200).json(files);
};

// Upload a file
export const uploadFile = async (
  req: FileUploadRequest,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const taskId = req.taskId;
  const userId = req.session?.user?.id;
  const file = req.file;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!taskId || isNaN(Number(taskId))) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  // Construct the file path relative to the uploads directory
  const filePath = path.join('uploads', file.filename);

  const fileData = await fileModel.createFile(
    pool,
    taskId,
    userId,
    file.originalname,
    file.filename,
    file.size,
    file.mimetype,
    filePath,
  );

  res.status(201).json(fileData);
};

// Download a file
export const downloadFile = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const { fileId } = req.params;
  const userId = (req as CustomRequest).session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const file = await fileModel.getFileById(pool, fileId);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const hasAccess = await fileModel.canUserAccessFile(pool, userId, fileId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this file' });
  }

  const resolvedPath = path.resolve(UPLOADS_DIR, file.stored_name);
  const relativePath = path.relative(UPLOADS_DIR, resolvedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return res.status(403).json({ error: 'Invalid file path' });
  }

  if (!fsSync.existsSync(resolvedPath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }
  res.download(resolvedPath, file.original_name);
};

// Delete a file
export const deleteFile = async (
  req: Request,
  res: Response,
  pool: Pool,
): Promise<Response | void> => {
  const { fileId } = req.params;
  const userId = (req as CustomRequest).session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const file = await fileModel.getFileById(pool, fileId);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const hasAccess = await fileModel.canUserAccessFile(pool, userId, fileId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to this file' });
  }

  // Anyone on the project may hold "Delete files", so restrict the delete to
  // the uploader's own attachments; an administrator may remove any of them.
  const isAdmin = await hasPermission(pool, userId, 'Admin');
  const deleted = await fileModel.deleteFile(
    pool,
    fileId,
    isAdmin ? undefined : userId,
  );
  if (!deleted) {
    return res.status(403).json({ error: 'Access denied to this file' });
  }

  const resolvedPath = path.resolve(UPLOADS_DIR, file.stored_name);
  const relativePath = path.relative(UPLOADS_DIR, resolvedPath);
  if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    try {
      await fs.unlink(resolvedPath);
    } catch (error) {
      logger.error({ err: error }, 'Error deleting file from disk');
    }
  }

  res.status(200).json({ message: 'File deleted successfully' });
};
