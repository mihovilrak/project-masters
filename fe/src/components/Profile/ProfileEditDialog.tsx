import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import { updateProfile } from '../../api/profiles';
import { ProfileEditDialogProps, ProfileFormData } from '../../types/profile';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({
  open,
  onClose,
  profile,
  onProfileUpdate,
}) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    name: profile?.name || '',
    surname: profile?.surname || '',
    email: profile?.email || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        surname: profile.surname || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        const updatedProfile = await updateProfile(formData);
        await onProfileUpdate(updatedProfile);
        onClose();
      } catch (err: unknown) {
        logger.error('Failed to update profile:', err);
        setError(getApiErrorMessage(err, 'Failed to update profile'));
      } finally {
        setLoading(false);
      }
    },
    [formData, onProfileUpdate, onClose],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="profile-edit-dialog-title"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="profile-edit-dialog-title">Edit Profile</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            name="name"
            label="First Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <TextField
            name="surname"
            label="Last Name"
            fullWidth
            margin="normal"
            value={formData.surname}
            onChange={handleChange}
            required
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProfileEditDialog;
