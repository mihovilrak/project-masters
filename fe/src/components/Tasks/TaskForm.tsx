import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  TextField,
  Button,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useTaskForm } from '../../hooks/task/useTaskForm';
import { SimpleChangeEvent } from '../../types/task';
import { Tag } from '../../types/tag';

import { DatePickerSection } from './Form/DatePickerSection';
import { ColorOptionSelect } from './Form/ColorOptionSelect';
import { ProjectSelect } from './ProjectSelect';
import { AssigneeSelectionSection } from './Form/AssigneeSelectionSection';
import { ParentTaskSelect } from './Form/ParentTaskSelect';
import TaskTypeSelect from './TaskTypeSelect';
import TagSelect from './TagSelect';

const TaskForm: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromQuery = queryParams.get('projectId');
  const parentId = queryParams.get('parentId');
  const { id } = useParams<{ id?: string }>();

  const {
    formData,
    fieldErrors,
    projects,
    projectMembers,
    projectTasks,
    selectError,
    statuses,
    priorities,
    isEditing,
    isLoading,
    handleChange,
    handleSubmit,
  } = useTaskForm({
    taskId: id,
    projectIdFromQuery,
    parentTaskId: parentId,
    currentUserId: currentUser?.id,
  });

  // Force project and parent task IDs from URL
  React.useEffect(() => {
    if (projectIdFromQuery) {
      handleChange({
        target: {
          name: 'project_id',
          value: parseInt(projectIdFromQuery, 10),
        },
      });
    }
  }, [projectIdFromQuery, handleChange]);

  React.useEffect(() => {
    if (parentId) {
      handleChange({
        target: {
          name: 'parent_id',
          value: parseInt(parentId, 10),
        },
      });
    }
  }, [parentId, handleChange]);

  const handleFormChange = (e: SimpleChangeEvent) => {
    // Don't allow changing project_id and parent_id if they come from URL
    if (
      (e.target.name === 'project_id' && projectIdFromQuery) ||
      (e.target.name === 'parent_id' && parentId)
    ) {
      return;
    }
    handleChange(e);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(e);
    // Navigation is handled in handleSubmit
  };

  return (
    <Box component={Paper} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 3 }}>
      <Typography variant="h4" gutterBottom>
        {isLoading ? 'Loading...' : isEditing ? 'Edit Task' : 'Create Task'}
      </Typography>
      {selectError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {selectError}
        </Alert>
      )}
      <form onSubmit={onSubmit} data-testid="task-form">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
              sx={{ mb: 2 }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: formData.project_id ? 6 : 12 }}>
            <ProjectSelect
              projects={projects}
              formData={formData}
              handleChange={handleFormChange}
              projectIdFromQuery={projectIdFromQuery}
            />
          </Grid>

          {formData.project_id && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <ParentTaskSelect
                formData={formData}
                projectTasks={projectTasks}
                handleChange={handleFormChange}
                parentIdFromUrl={parentId}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              name="description"
              value={formData.description || ''}
              onChange={handleFormChange}
              sx={{ mb: 2 }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <DatePickerSection
              formData={formData}
              handleChange={handleFormChange}
              errors={{
                start_date: fieldErrors.start_date,
                due_date: fieldErrors.due_date,
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <ColorOptionSelect
              label="Priority"
              name="priority_id"
              value={formData.priority_id || ''}
              options={priorities}
              handleChange={handleFormChange}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ColorOptionSelect
              label="Status"
              name="status_id"
              value={formData.status_id || ''}
              options={statuses}
              handleChange={handleFormChange}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <AssigneeSelectionSection
              formData={formData}
              projectMembers={projectMembers}
              handleChange={handleFormChange}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ mb: 2 }}>
              <TaskTypeSelect
                value={formData.type_id || 0}
                onChange={(e) =>
                  handleFormChange({
                    target: { name: 'type_id', value: e.target.value },
                  })
                }
                required
              />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Estimated Time (hours)"
              name="estimated_time"
              type="number"
              value={formData.estimated_time ?? ''}
              onChange={handleFormChange}
              inputProps={{ min: 0, step: 0.5 }}
              sx={{ mb: 2 }}
            />
          </Grid>

          {isEditing && (
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                type="number"
                label="Progress (%)"
                name="progress"
                value={formData.progress || 0}
                onChange={handleFormChange}
                inputProps={{ min: 0, max: 100, step: 1 }}
                sx={{ mb: 2 }}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <TagSelect
                selectedTags={formData.tags || []}
                onTagsChange={(newTags: Tag[]) =>
                  handleFormChange({ target: { name: 'tags', value: newTags } })
                }
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                mt: 2,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
              }}
            >
              <Button
                type="button"
                data-testid="cancel-button"
                onClick={() => window.history.back()}
                color="inherit"
              >
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary">
                {isEditing ? 'Update Task' : 'Create Task'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default TaskForm;
