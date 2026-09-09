import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser, getUserById, updateUser } from '../../api/users';
import { getRoles } from '../../api/roles';
import { Role } from '../../types/role';
import {
  UserFormData,
  UserCreate,
  UserUpdate,
  UserFormProps,
} from '../../types/user';
import logger from '../../utils/logger';
import getApiErrorMessage from '../../utils/getApiErrorMessage';

export const useUserForm = ({ userId }: UserFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [formValues, setFormValues] = useState<UserFormData>({
    login: '',
    name: '',
    surname: '',
    email: '',
    password: '',
    currentPassword: '',
    confirmPassword: '',
    role_id: 4,
  });

  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoading(true);
        const roleData = await getRoles();
        setRoles(roleData);
        setError((prev) => (prev ? null : prev));
      } catch (error) {
        logger.error('Failed to fetch roles', error);
        setError('Failed to load roles');
      } finally {
        setLoading(false);
      }
    };

    loadRoles();

    if (userId) {
      fetchUserData(parseInt(userId));
    }
  }, [userId]);

  const fetchUserData = async (id: number) => {
    try {
      const user = await getUserById(id);
      setFormValues({
        login: user.login || '',
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        password: '',
        currentPassword: '',
        confirmPassword: '',
        role_id: Number(user.role_id) || 4,
      });
    } catch (error) {
      logger.error('Failed to fetch user data', error);
      setError('Failed to fetch user data');
    }
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormValues((prev) => ({
        ...prev,
        [name]: name === 'role_id' ? Number(value) : value,
      }));
      setError(null);
      setFieldErrors((prev) => {
        if (prev[name]) {
          const next = { ...prev };
          delete next[name];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      logger.debug('DEBUG formValues at submit:', formValues);
      e.preventDefault();

      const isEditMode = !!userId;
      const err: Record<string, string> = {};

      if (!formValues.login?.trim()) err.login = 'Login is required';
      if (!formValues.name?.trim()) err.name = 'First name is required';
      if (!formValues.surname?.trim()) err.surname = 'Last name is required';
      if (!formValues.email?.trim()) err.email = 'Email is required';

      if (isEditMode) {
        if (formValues.password) {
          if (!formValues.currentPassword?.trim())
            err.currentPassword =
              'Current password is required to change password';
          if (formValues.password !== formValues.confirmPassword) {
            err.confirmPassword = 'New passwords do not match';
          }
        }
      } else {
        if (!formValues.password) err.password = 'Password is required';
        else if (formValues.password !== formValues.confirmPassword) {
          err.confirmPassword = 'Passwords do not match';
        }
        if (!formValues.confirmPassword && !err.confirmPassword)
          err.confirmPassword = 'Please confirm password';
      }

      if (Object.keys(err).length > 0) {
        setFieldErrors(err);
        setError('Please fill in all required fields');
        return;
      }
      setFieldErrors({});
      setError(null);

      try {
        const userData = {
          login: formValues.login,
          name: formValues.name,
          surname: formValues.surname,
          email: formValues.email,
          role_id: formValues.role_id,
          ...(formValues.status_id && { status_id: formValues.status_id }),
          // Only include password fields if setting a new password in edit mode
          // or if creating a new user
          ...(isEditMode
            ? formValues.password
              ? {
                  password: formValues.password,
                  currentPassword: formValues.currentPassword,
                }
              : {}
            : {
                password: formValues.password,
              }),
        };

        if (userId) {
          await updateUser(parseInt(userId), userData as UserUpdate);
        } else {
          await createUser(userData as UserCreate);
        }
        navigate('/users');
      } catch (error: unknown) {
        logger.error('Failed to save user', error);
        setError(getApiErrorMessage(error, 'Failed to save user'));
      }
    },
    [formValues, userId, navigate],
  );

  return {
    loading,
    error,
    fieldErrors,
    roles,
    formValues,
    handleInputChange,
    handleSubmit,
  };
};
