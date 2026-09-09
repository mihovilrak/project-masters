import React from 'react';
import {
  List,
  Link,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Avatar,
  Box,
  Paper,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CommentEditDialog from './CommentEditDialog';
import { CommentListProps } from '../../types/comment';
import { useCommentMenu } from '../../hooks/comment/useCommentMenu';

const CommentList: React.FC<CommentListProps> = ({
  comments,
  onCommentUpdated,
  onCommentDeleted,
}) => {
  const {
    anchorEl,
    selectedComment,
    editDialogOpen,
    handleMenuOpen,
    handleMenuClose,
    handleEditClick,
    handleEditClose,
    handleEditSave,
    handleDeleteClick,
  } = useCommentMenu(onCommentUpdated, onCommentDeleted);

  if (!comments || comments.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          No comments yet
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <List>
        {comments.map((comment, index) => (
          <Paper
            key={comment?.id ?? `comment-${index}`}
            elevation={0}
            sx={{ mb: 2, p: 2, backgroundColor: 'background.default' }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                mb: 1,
              }}
            >
              <Avatar
                src={comment?.user_avatar || undefined}
                alt={comment?.user_name || 'User'}
                sx={{ width: 32, height: 32, mr: 2 }}
                data-testid="avatar-test"
              />
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="subtitle2">
                    {comment?.user_id ? (
                      <Link
                        component={RouterLink}
                        to={`/users/${comment.user_id}`}
                        color="primary"
                      >
                        {comment?.user_name || 'Unknown User'}
                      </Link>
                    ) : (
                      <span>{comment?.user_name || 'Unknown User'}</span>
                    )}
                  </Typography>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {comment?.created_on
                        ? new Date(comment.created_on).toLocaleString()
                        : 'Unknown date'}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => comment && handleMenuOpen(e, comment)}
                      sx={{ ml: 1 }}
                      aria-label="Comment actions"
                      disabled={!comment}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {comment?.comment || 'No comment text'}
                </Typography>
              </Box>
            </Box>
            {comment?.updated_on && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                Edited {new Date(comment.updated_on).toLocaleString()}
              </Typography>
            )}
          </Paper>
        ))}
      </List>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        role="menu"
        aria-label="comment actions"
      >
        <MenuItem onClick={handleEditClick} role="menuitem">
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{ color: 'error.main' }}
          role="menuitem"
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <CommentEditDialog
        open={editDialogOpen}
        comment={selectedComment}
        onClose={handleEditClose}
        onSave={handleEditSave}
      />
    </>
  );
};

export default CommentList;
