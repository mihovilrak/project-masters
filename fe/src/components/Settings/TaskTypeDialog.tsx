import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  IconButton,
  Box,
  FormControl,
  InputLabel,
} from '@mui/material';
import * as Icons from '@mui/icons-material';
import { MuiColorInput } from 'mui-color-input';
import { TaskTypeDialogProps, IconSelectorProps } from '../../types/setting';
import { useIconSelector } from '../../hooks/setting/useIconSelector';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

const IconSelector = ({ value, onChange }: IconSelectorProps) => {
  const { icons, open, error, handleOpen, handleClose, handleSelect } =
    useIconSelector(value);

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null;
    try {
      const IconComponent = Icons[
        iconName as keyof typeof Icons
      ] as React.ComponentType<any>;
      return IconComponent ? <IconComponent /> : null;
    } catch {
      return null;
    }
  };

  return (
    <FormControl fullWidth margin="normal">
      <InputLabel shrink>Icon</InputLabel>
      <Box mt={2}>
        <IconButton
          onClick={handleOpen}
          aria-label={value ? `Icon: ${value}. Change icon` : 'Select icon'}
          sx={{
            border: '1px dashed grey',
            borderRadius: 1,
            width: '100%',
            height: '56px',
          }}
        >
          {value ? getIconComponent(value) || value : 'Select Icon'}
        </IconButton>
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="task-type-dialog-title"
      >
        <DialogTitle id="task-type-dialog-title">Select an Icon</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={1} sx={{ p: 2 }}>
            {(icons || []).map((iconName, index) => {
              const IconComponent = iconName
                ? getIconComponent(iconName)
                : null;
              return (
                <Grid key={iconName ?? `icon-${index}`} size={{ xs: 6, sm: 4 }}>
                  <IconButton
                    onClick={() => {
                      if (iconName) {
                        handleSelect(iconName);
                        onChange(iconName);
                      }
                    }}
                    disabled={!iconName}
                    aria-label={iconName ? `Select icon ${iconName}` : 'Icon'}
                    sx={{
                      border:
                        value === iconName ? '2px solid primary.main' : 'none',
                      borderRadius: 1,
                    }}
                  >
                    {IconComponent || iconName || 'Unknown'}
                  </IconButton>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
      </Dialog>
    </FormControl>
  );
};

const TaskTypeDialog: React.FC<TaskTypeDialogProps> = ({
  open,
  taskType,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#2196f3',
    description: '',
    icon: 'Task' as string | undefined,
    active: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskType) {
      setFormData({
        name: taskType?.name || '',
        color: taskType?.color || '#2196f3',
        description: taskType?.description || '',
        icon: taskType?.icon || 'Task',
        active: taskType?.active ?? true,
      });
    } else {
      setFormData({
        name: '',
        color: '#2196f3',
        description: '',
        icon: 'Task',
        active: true,
      });
    }
  }, [taskType]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Ensure icon is provided (required by database)
    if (!formData.icon || formData.icon.trim() === '') {
      setError('Icon is required');
      return;
    }

    try {
      await onSave(taskType ? { ...formData, id: taskType.id } : formData);
      onClose();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to save task type'));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="task-type-dialog-title-2"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="task-type-dialog-title-2">
          {taskType ? 'Edit Task Type' : 'Create Task Type'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <MuiColorInput
                format="hex"
                label="Color"
                value={formData.color}
                onChange={(value) => handleChange('color', value)}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <IconSelector
                value={formData.icon}
                onChange={(icon) => handleChange('icon', icon)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={(e) => handleChange('active', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {taskType ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskTypeDialog;
