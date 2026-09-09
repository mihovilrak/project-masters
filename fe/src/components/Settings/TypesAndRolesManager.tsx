import React from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import TaskTypesTable from './TaskTypesTable';
import ActivityTypesTable from './ActivityTypesTable';
import RolesTable from './RolesTable';
import { TypesAndRolesDialog } from './TypesAndRolesDialog';
import { useTypesAndRoles } from '../../hooks/setting/useTypesAndRoles';
import { usePermission } from '../../hooks/common/usePermission';

const TypesAndRolesManager: React.FC = () => {
  const { hasPermission: canManage, loading: permissionLoading } =
    usePermission('Admin');
  const {
    state,
    handleTabChange,
    handleCreate,
    handleEdit,
    handleDialogClose,
    handleSave,
    handleDelete,
    handleRoleUpdate,
  } = useTypesAndRoles();

  const renderContent = () => {
    if (state.loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography>Loading...</Typography>
        </Box>
      );
    }

    switch (state.activeTab) {
      case 0:
        return (
          <TaskTypesTable
            taskTypes={state.taskTypes || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={state.loading}
            canManage={canManage}
          />
        );
      case 1:
        return (
          <ActivityTypesTable
            activityTypes={state.activityTypes || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={state.loading}
            canManage={canManage}
          />
        );
      case 2:
        return (
          <RolesTable
            roles={state.roles || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={state.loading}
            canManage={canManage}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={state.activeTab} onChange={handleTabChange}>
          <Tab label="Task Types" />
          <Tab label="Activity Types" />
          <Tab label="Roles" />
        </Tabs>
      </Box>

      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {state.error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={permissionLoading || !canManage}
        >
          {state.activeTab === 0 && 'Add Task Type'}
          {state.activeTab === 1 && 'Add Activity Type'}
          {state.activeTab === 2 && 'Add Role'}
        </Button>
      </Box>

      {renderContent()}

      <TypesAndRolesDialog
        activeTab={state.activeTab}
        dialogOpen={state.dialogOpen}
        selectedItem={state.selectedItem}
        onClose={handleDialogClose}
        onSave={handleSave}
      />
    </Paper>
  );
};

export default TypesAndRolesManager;
