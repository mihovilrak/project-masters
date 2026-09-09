import React from 'react';
import {
  Grid,
  Typography,
  LinearProgress,
  List,
  ListItem,
  Link,
  Alert,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatDatePattern } from '../../../utils/dateUtils';
import { ProjectOverviewProps } from '../../../types/project';
import PermissionButton from '../../common/PermissionButton';
import { useProjectOverview } from '../../../hooks/project/useProjectOverview';

const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  projectDetails,
}) => {
  const {
    subprojects,
    error: subprojectsError,
    handleAddSubproject,
  } = useProjectOverview(project?.id);

  if (!project || !projectDetails) {
    return <Typography>Loading project details...</Typography>;
  }

  return (
    <Grid container spacing={2}>
      {subprojectsError && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">{subprojectsError}</Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Typography variant="body1" paragraph>
          <strong>Description:</strong>{' '}
          {projectDetails?.description || 'No description provided'}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>
          <strong>Start Date:</strong>{' '}
          {projectDetails?.start_date
            ? formatDatePattern(projectDetails.start_date, 'DD/MM/YYYY')
            : 'Not set'}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>
          <strong>Due Date:</strong>{' '}
          {projectDetails?.due_date
            ? formatDatePattern(projectDetails.due_date, 'DD/MM/YYYY')
            : 'Not set'}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>
          <strong>Status:</strong> {projectDetails?.status_name || 'Unknown'}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>
          <strong>Parent Project:</strong>{' '}
          {projectDetails?.parent_id ? (
            <Link
              component={RouterLink}
              to={`/projects/${projectDetails.parent_id}`}
              underline="hover"
            >
              {projectDetails?.parent_name || 'Unknown'}
            </Link>
          ) : (
            'None'
          )}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>
          <strong>Created By:</strong>{' '}
          {projectDetails?.created_by_name && projectDetails?.created_by ? (
            <Link
              component={RouterLink}
              to={`/users/${projectDetails.created_by}`}
              underline="hover"
            >
              {projectDetails.created_by_name}
            </Link>
          ) : (
            'Unknown'
          )}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>
          <strong>Created On:</strong>{' '}
          {projectDetails?.created_on
            ? formatDatePattern(projectDetails.created_on, 'DD/MM/YYYY')
            : 'Unknown'}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography gutterBottom>
          <strong>Progress:</strong> {projectDetails?.progress ?? 0}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={projectDetails?.progress ?? 0}
          sx={{ height: 10, borderRadius: 1 }}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>
          <strong>Estimated Time:</strong> {projectDetails?.estimated_time ?? 0}{' '}
          hours
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography>
          <strong>Spent Time:</strong>{' '}
          {(Number(projectDetails?.spent_time) || 0).toFixed(2)} hours
        </Typography>
      </Grid>

      {project?.parent_id == null && (
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Subprojects
          </Typography>
          {subprojects && subprojects.length > 0 ? (
            <List>
              {subprojects.map((subproject) => (
                <ListItem key={subproject?.id}>
                  <Link
                    component={RouterLink}
                    to={`/projects/${subproject?.id}`}
                    underline="hover"
                  >
                    {subproject?.name || 'Unnamed Project'}
                  </Link>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="textSecondary">No subprojects found</Typography>
          )}
          <PermissionButton
            requiredPermission="Create projects"
            variant="contained"
            color="primary"
            onClick={handleAddSubproject}
            sx={{ mt: 2 }}
          >
            Add Subproject
          </PermissionButton>
        </Grid>
      )}
    </Grid>
  );
};

export default ProjectOverview;
