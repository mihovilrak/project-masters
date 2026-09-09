import { Permission } from './admin';

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  active?: boolean;
  created_on?: string;
  updated_on?: string | null;
  // Virtual fields from joins
  permissions?: Permission[] | number[];
}

export interface RolesTableProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete?: (id: number) => Promise<void>;
  loading?: boolean;
  canManage?: boolean;
}

export interface RoleFormData {
  name: string;
  description: string;
  active: boolean;
  permissions: number[];
}

export interface RoleFormProps {
  formData: RoleFormData;
  groupedPermissions: Record<string, Permission[]>;
  onChange: (field: string, value: string | boolean) => void;
  onPermissionToggle: (permission: Permission) => void;
}

export interface RoleDialogProps {
  open: boolean;
  role?: Role;
  onClose: () => void;
  onSave: (role: Partial<Role>) => Promise<void>;
}
