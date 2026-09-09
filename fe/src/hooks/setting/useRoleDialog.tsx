import { useState, useEffect } from 'react';
import { Role } from '../../types/role';
import { Permission } from '../../types/setting';
import { RoleFormData } from '../../types/role';
import { getAllPermissions } from '../../api/permissions';
import { useAsyncResource } from '../common/useAsyncResource';

const EMPTY_PERMISSIONS: Permission[] = [];

export const useRoleDialog = (role: Role | undefined) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    active: true,
    permissions: [],
  });

  const {
    data: availablePermissions,
    error: fetchError,
    setError: setFetchError,
  } = useAsyncResource<Permission[]>(
    async (signal) => (await getAllPermissions(signal)) || [],
    [],
    {
      initialData: EMPTY_PERMISSIONS,
      errorMessage: 'Failed to load permissions',
    },
  );

  useEffect(() => {
    if (role) {
      setFormData({
        name: role?.name || '',
        description: role?.description || '',
        active: role?.active ?? true,
        permissions: role?.permissions
          ? role.permissions
              .map((p) => (typeof p === 'number' ? p : p?.id || 0))
              .filter((id) => id > 0)
          : [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        active: true,
        permissions: [],
      });
    }
  }, [role]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePermissionToggle = (permission: Permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission.id)
        ? prev.permissions.filter((id) => id !== permission.id)
        : [...prev.permissions, permission.id],
    }));
  };

  const clearError = () => setFetchError(null);

  const groupedPermissions = availablePermissions.reduce<
    Record<string, Permission[]>
  >((acc, permission) => {
    const category = permission.name.split('_')[0];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {});

  return {
    formData,
    error: fetchError ?? undefined,
    groupedPermissions,
    handleChange,
    handlePermissionToggle,
    clearError,
    setError: setFetchError,
  };
};
