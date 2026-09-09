import { useState } from 'react';
import {
  TypesAndRolesState,
  TaskType,
  ActivityType,
} from '../../types/setting';
import { Role as AdminRole } from '../../types/role';
import { Permission } from '../../types/admin';
import {
  deleteActivityType,
  updateActivityType,
  getActivityTypes,
  createActivityType,
} from '../../api/activityTypes';
import { getRoles, updateRole, createRole, deleteRole } from '../../api/roles';
import {
  getTaskTypes,
  deleteTaskType,
  updateTaskType,
  createTaskType,
} from '../../api/taskTypes';
import { useAsyncResource } from '../common/useAsyncResource';

interface TypesAndRolesData {
  taskTypes: TaskType[];
  activityTypes: ActivityType[];
  roles: AdminRole[];
}

const EMPTY_DATA: TypesAndRolesData = {
  taskTypes: [],
  activityTypes: [],
  roles: [],
};

// API rows expose the flag as either `active` or `is_active` depending on age of the record
const withActive = <T extends { active?: boolean; is_active?: boolean }>(
  rows: T[],
): T[] => rows.map((r) => ({ ...r, active: r.active ?? r.is_active ?? false }));

export const useTypesAndRoles = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    TaskType | ActivityType | AdminRole | null
  >(null);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    data,
    loading,
    error: fetchError,
    refetch: fetchData,
  } = useAsyncResource<TypesAndRolesData>(
    async (signal) => {
      const [taskTypesData, activityTypesData, rolesData] = await Promise.all([
        getTaskTypes(signal),
        getActivityTypes(signal),
        getRoles(signal),
      ]);
      return {
        taskTypes: withActive(taskTypesData) as TaskType[],
        activityTypes: withActive(activityTypesData) as ActivityType[],
        roles: rolesData as AdminRole[],
      };
    },
    [],
    { initialData: EMPTY_DATA, errorMessage: 'Failed to fetch data' },
  );

  const state: TypesAndRolesState = {
    activeTab,
    taskTypes: data.taskTypes,
    activityTypes: data.activityTypes,
    roles: data.roles,
    loading: loading || mutating,
    error: mutationError ?? fetchError,
    dialogOpen,
    selectedItem,
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setActiveTab(newValue);
  };

  const handleCreate = (): void => {
    setDialogOpen(true);
    setSelectedItem(null);
  };

  const handleEdit = (item: TaskType | ActivityType | AdminRole): void => {
    setDialogOpen(true);
    setSelectedItem(item);
  };

  const handleDialogClose = (): void => {
    setDialogOpen(false);
    setSelectedItem(null);
  };

  const runMutation = async (
    mutate: () => Promise<void>,
    fallbackMessage: string,
  ): Promise<void> => {
    try {
      setMutating(true);
      setMutationError(null);
      await mutate();
      await fetchData();
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : fallbackMessage,
      );
    } finally {
      setMutating(false);
    }
  };

  const handleSave = async (
    item: Partial<TaskType | ActivityType | AdminRole>,
  ): Promise<void> => {
    // Fall back to selectedItem.id so editing updates the record when the dialog omits it
    const id = item.id ?? (selectedItem as { id?: number } | null)?.id;
    const resolvedId = id != null ? Number(id) : undefined;

    await runMutation(async () => {
      if (activeTab === 0) {
        if (resolvedId != null) {
          await updateTaskType(resolvedId, item as TaskType);
        } else {
          await createTaskType(item as TaskType);
        }
      } else if (activeTab === 1) {
        if (resolvedId != null) {
          await updateActivityType(resolvedId, item as ActivityType);
        } else {
          await createActivityType(item as ActivityType);
        }
      } else if (activeTab === 2) {
        const roleData = item as Partial<AdminRole>;
        if (resolvedId != null) {
          await updateRole(resolvedId, roleData);
        } else {
          await createRole(roleData);
        }
      }
      handleDialogClose();
    }, 'Failed to save item');
  };

  const handleDelete = async (id: number): Promise<void> =>
    runMutation(async () => {
      if (activeTab === 0) {
        await deleteTaskType(id);
      } else if (activeTab === 1) {
        await deleteActivityType(id);
      } else if (activeTab === 2) {
        await deleteRole(id);
      }
    }, 'Failed to delete item');

  const handleRoleUpdate = async (updatedRole: AdminRole): Promise<void> =>
    runMutation(async () => {
      const roleToUpdate: Partial<AdminRole> = {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: (updatedRole.permissions || []).map(
          (p) =>
            ({
              id: typeof p === 'number' ? p : p.id,
              name: typeof p === 'number' ? String(p) : p.name,
              active: true,
              created_on: new Date().toISOString(),
              updated_on: null,
            }) as Permission,
        ),
      };

      await updateRole(updatedRole.id, roleToUpdate);
    }, 'Failed to update role');

  return {
    state,
    handleTabChange,
    handleCreate,
    handleEdit,
    handleDialogClose,
    handleSave,
    handleDelete,
    handleRoleUpdate,
  };
};
