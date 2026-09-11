import { Pool } from 'pg';
import { Comment, CommentWithUser } from '../types/comment';

// Get all comments for a task
export const getTaskComments = async (
  pool: Pool,
  taskId: string,
): Promise<CommentWithUser[]> => {
  const result = await pool.query(
    'SELECT * FROM get_comments(p_task_id => $1)',
    [taskId],
  );
  return result.rows;
};

// Create a new comment for a task
export const createComment = async (
  pool: Pool,
  taskId: string,
  userId: string,
  comment: string,
): Promise<Comment> => {
  const result = await pool.query(
    `INSERT INTO comments (task_id, user_id, comment)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [taskId, userId, comment],
  );
  return result.rows[0];
};

// Fetch the created comment with user details
export const commentWithUser = async (
  pool: Pool,
  id: string,
): Promise<CommentWithUser | null> => {
  const result = await pool.query('SELECT * FROM get_comments(p_id => $1)', [
    id,
  ]);
  return result.rows[0] || null;
};

// Edit a comment
export const editComment = async (
  pool: Pool,
  id: string,
  comment: string,
): Promise<CommentWithUser | null> => {
  // Update the comment
  const updated = await pool.query(
    `UPDATE comments
    SET (comment, updated_on) = ($2, current_timestamp)
    WHERE id = $1 AND active`,
    [id, comment],
  );

  // A stale or deleted id matches nothing; report that instead of returning the
  // row a follow-up read might still find.
  if (!updated.rowCount) {
    return null;
  }

  // Fetch the updated comment with user details
  const result = await pool.query('SELECT * FROM get_comments(p_id => $1)', [
    id,
  ]);

  return result.rows[0] || null;
};

// Delete a comment
export const deleteComment = async (
  pool: Pool,
  id: string,
): Promise<Comment | null> => {
  const result = await pool.query(
    `UPDATE comments
    SET (active, updated_on) = (false, current_timestamp)
    WHERE id = $1 AND active
    RETURNING *`,
    [id],
  );
  return result.rows[0] || null;
};
