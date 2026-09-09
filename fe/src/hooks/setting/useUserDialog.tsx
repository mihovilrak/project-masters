import { useState, useEffect } from 'react';
import { SelectChangeEvent } from '@mui/material';
import { User, UserFormData, UserUpdate, UserCreate } from '../../types/user';
import { createUser, updateUser } from '../../api/users';
import { getRoles } from '../../api/roles';
import { Role } from '../../types/role';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';
import { UserStatusId } from '../../constants/statusIds';

export const useUserDialog = (
  user: User | null | undefined,
  open: boolean,
  onClose: () => void,
  onUserSaved: (user: User) => void,
) => {
  const [formData, setFormData] = useState<UserFormData>({
    login: '',
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: '',
    role_id: 3,
    status_id: UserStatusId.Active,
  });
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState<boolean>(true);

  // Fetch roles from API when dialog opens
  useEffect(() => {
    if (open) {
      const loadRoles = async () => {
        try {
          setRolesLoading(true);
          const rolesData = await getRoles();
          setRoles(rolesData);
        } catch (error) {
          logger.error('Failed to fetch roles:', error);
          setError('Failed to load roles');
        } finally {
          setRolesLoading(false);
        }
      };
      loadRoles();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (user) {
      setFormData({
        login: user.login || '',
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        role_id: user.role_id || 3,
        status_id: user.status_id,
      });
    } else {
      setFormData({
        login: '',
        name: '',
        surname: '',
        email: '',
        password: '',
        confirmPassword: '',
        role_id: 3,
        status_id: UserStatusId.Active,
      });
    }
  }, [user, open]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (e: SelectChangeEvent<number>): void => {
    setFormData((prev) => ({
      ...prev,
      role_id: e.target.value as number,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (
      !formData.login ||
      !formData.name ||
      !formData.surname ||
      !formData.email
    ) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate passwords
    if (user) {
      // Edit mode: if password is provided, confirmPassword is required
      if (formData.password && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    } else {
      // Create mode: password and confirmPassword are required
      if (!formData.password || !formData.confirmPassword) {
        setError('Password and password confirmation are required');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    try {
      let savedUser;
      if (user) {
        // For update, only send changed fields
        const updates: UserUpdate = {
          id: user.id,
        };
        if (formData.name !== user.name) updates.name = formData.name;
        if (formData.surname !== user.surname)
          updates.surname = formData.surname;
        if (formData.email !== user.email) updates.email = formData.email;
        if (formData.password) updates.password = formData.password;
        if (formData.role_id !== user.role_id)
          updates.role_id = formData.role_id;

        savedUser = await updateUser(user.id, updates);
      } else {
        // Exclude confirmPassword from API call
        const { confirmPassword, ...userData } = formData;
        savedUser = await createUser(userData as UserCreate);
      }
      onUserSaved(savedUser);
      onClose();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Failed to save user'));
    }
  };

  return {
    formData,
    error,
    roles,
    rolesLoading,
    handleTextChange,
    handleRoleChange,
    handleSubmit,
  };
};
