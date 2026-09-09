import { useAuth } from '../../context/AuthContext';
import { UsePermissionResult } from '../../types/common';

export const usePermission = (
  requiredPermission: string,
): UsePermissionResult => {
  const { hasPermission: checkPermission, permissionsLoading } = useAuth();

  return {
    hasPermission: checkPermission(requiredPermission),
    loading: permissionsLoading,
  };
};
