import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  SelectChangeEvent,
  Tooltip,
  IconButton,
  Divider,
  Grid,
  Autocomplete,
  ListSubheader,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  LooksOne,
  LooksTwo,
  Looks3,
  Send as SendIcon,
} from '@mui/icons-material';
import { useSystemSettings } from '../../hooks/setting/useSystemSettings';
import { sanitizeHtml } from '../../utils/sanitize';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { testSmtpConnection, SmtpTestResult } from '../../api/settings';
import { LogLevel } from '../../types/setting';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <Box sx={{ mb: 2, '& button': { mr: 1, mb: 1 } }}>
      <Tooltip title="Bold">
        <IconButton
          size="small"
          aria-label="Bold"
          color={editor.isActive('bold') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBold />
        </IconButton>
      </Tooltip>
      <Tooltip title="Italic">
        <IconButton
          size="small"
          aria-label="Italic"
          color={editor.isActive('italic') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalic />
        </IconButton>
      </Tooltip>
      <Tooltip title="Underline">
        <IconButton
          size="small"
          aria-label="Underline"
          color={editor.isActive('underline') ? 'primary' : 'default'}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <FormatUnderlined />
        </IconButton>
      </Tooltip>
      <Tooltip title="Heading 1">
        <IconButton
          size="small"
          aria-label="Heading 1"
          color={
            editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'
          }
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <LooksOne />
        </IconButton>
      </Tooltip>
      <Tooltip title="Heading 2">
        <IconButton
          size="small"
          aria-label="Heading 2"
          color={
            editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'
          }
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <LooksTwo />
        </IconButton>
      </Tooltip>
      <Tooltip title="Heading 3">
        <IconButton
          size="small"
          aria-label="Heading 3"
          color={
            editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'
          }
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Looks3 />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

const SystemSettings: React.FC = () => {
  const {
    state,
    timezones,
    timezonesLoading,
    timezonesError,
    handleSubmit,
    handleChange,
    setField,
  } = useSystemSettings();
  const [tabValue, setTabValue] = React.useState(0);
  const [smtpTestEmail, setSmtpTestEmail] = React.useState('');
  const [smtpTestLoading, setSmtpTestLoading] = React.useState(false);
  const [smtpTestResult, setSmtpTestResult] =
    React.useState<SmtpTestResult | null>(null);
  const LOG_LEVEL_OPTIONS: LogLevel[] = ['error', 'warn', 'info', 'debug'];

  const handleSmtpTest = async () => {
    if (!smtpTestEmail) {
      setSmtpTestResult({
        success: false,
        message: 'Please enter an email address',
      });
      return;
    }

    setSmtpTestLoading(true);
    setSmtpTestResult(null);

    try {
      const result = await testSmtpConnection(smtpTestEmail);
      setSmtpTestResult(result);
    } catch (error) {
      setSmtpTestResult({
        success: false,
        message: 'Failed to test SMTP connection',
      });
    } finally {
      setSmtpTestLoading(false);
    }
  };

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: state.settings.welcome_message || '',
    onUpdate: ({ editor }) => {
      handleChange({
        target: {
          name: 'welcome_message',
          value: editor.getHTML(),
        },
      } as React.ChangeEvent<HTMLInputElement>);
    },
  });

  React.useEffect(() => {
    if (editor && state.settings.welcome_message !== editor.getHTML()) {
      editor.commands.setContent(state.settings.welcome_message || '');
    }
  }, [editor, state.settings.welcome_message]);

  // Update document title when app_name changes
  React.useEffect(() => {
    if (state.settings.app_name) {
      document.title = state.settings.app_name;
    }
  }, [state.settings.app_name]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleThemeChange = (event: SelectChangeEvent<string>) => {
    handleChange({
      target: {
        name: 'theme',
        value: event.target.value,
      },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  if (state.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        System Settings
      </Typography>

      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {state.error}
        </Alert>
      )}

      {state.success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings updated successfully
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="App Name"
                name="app_name"
                value={state.settings.app_name || ''}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                label="Company Name"
                name="company_name"
                value={state.settings.company_name || ''}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                label="Sender Email"
                name="sender_email"
                value={state.settings.sender_email || ''}
                onChange={handleChange}
                fullWidth
                type="email"
              />
              <Autocomplete
                options={timezones}
                loading={timezonesLoading}
                groupBy={(option) => option.region}
                renderGroup={(params) => (
                  <React.Fragment key={params.key}>
                    <ListSubheader sx={{ fontWeight: 700 }}>
                      {params.group}
                    </ListSubheader>
                    {params.children}
                  </React.Fragment>
                )}
                getOptionLabel={(option) => option.label}
                value={
                  timezones.find(
                    (tz) => tz.name === state.settings.time_zone,
                  ) || null
                }
                onChange={(_, newValue) => {
                  const value = newValue?.name || '';
                  handleChange({
                    target: {
                      name: 'time_zone',
                      value,
                    },
                  } as React.ChangeEvent<HTMLInputElement>);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Time Zone"
                    fullWidth
                    error={Boolean(timezonesError)}
                    helperText={timezonesError || ''}
                  />
                )}
              />
              <FormControl fullWidth>
                <InputLabel id="theme-label">Theme</InputLabel>
                <Select
                  labelId="theme-label"
                  name="theme"
                  value={state.settings.theme || 'light'}
                  label="Theme"
                  onChange={handleThemeChange}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Welcome Message
                </Typography>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="Editor" />
                    <Tab label="Preview" />
                  </Tabs>
                </Box>
                <TabPanel value={tabValue} index={0}>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      '.ProseMirror': {
                        minHeight: '200px',
                        padding: 2,
                        '&:focus': {
                          outline: 'none',
                        },
                      },
                    }}
                  >
                    <MenuBar editor={editor} />
                    <EditorContent editor={editor} />
                  </Box>
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      minHeight: '200px',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(
                          state.settings.welcome_message ?? '',
                        ),
                      }}
                    />
                  </Box>
                </TabPanel>
              </Box>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={state.loading}
                sx={{ mt: 2 }}
              >
                {state.loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </form>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Email Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Send a test email to verify your SMTP configuration is working
              correctly.
            </Typography>

            {smtpTestResult && (
              <Alert
                severity={smtpTestResult.success ? 'success' : 'error'}
                sx={{ mb: 2 }}
                onClose={() => setSmtpTestResult(null)}
              >
                {smtpTestResult.message}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Test Email Address"
                type="email"
                value={smtpTestEmail}
                onChange={(e) => setSmtpTestEmail(e.target.value)}
                placeholder="recipient@example.com"
                size="small"
                sx={{ minWidth: 300 }}
                disabled={smtpTestLoading}
                data-testid="smtp-test-email"
              />
              <Button
                variant="outlined"
                color="primary"
                onClick={handleSmtpTest}
                disabled={smtpTestLoading || !smtpTestEmail}
                startIcon={
                  smtpTestLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <SendIcon />
                  )
                }
                data-testid="smtp-test-button"
              >
                {smtpTestLoading ? 'Sending...' : 'Send Test Email'}
              </Button>
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ pl: { md: 2 } }}>
            <Typography variant="h6" gutterBottom>
              Runtime Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Saved with the Save Settings button and applied without
              restarting. SMTP credentials stay in the server environment and
              are never shown here.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="App Base URL"
                name="app_base_url"
                value={state.settings.app_base_url || ''}
                onChange={handleChange}
                helperText="Used to build links in notification emails"
                fullWidth
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel id="log-level-label">Log Level</InputLabel>
                <Select
                  labelId="log-level-label"
                  label="Log Level"
                  value={state.settings.log_level || 'info'}
                  onChange={(e) =>
                    setField('log_level', e.target.value as LogLevel)
                  }
                >
                  {LOG_LEVEL_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(state.settings.email_enabled)}
                    onChange={(e) =>
                      setField('email_enabled', e.target.checked)
                    }
                    inputProps={{ 'aria-label': 'Email enabled' }}
                  />
                }
                label="Email sending enabled"
              />
              <TextField
                label="SMTP Host"
                name="email_host"
                value={state.settings.email_host || ''}
                onChange={handleChange}
                fullWidth
                size="small"
              />
              <TextField
                label="SMTP Port"
                type="number"
                value={state.settings.email_port ?? ''}
                onChange={(e) =>
                  setField('email_port', Number(e.target.value))
                }
                fullWidth
                size="small"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(state.settings.email_secure)}
                    onChange={(e) => setField('email_secure', e.target.checked)}
                    inputProps={{ 'aria-label': 'SMTP implicit TLS' }}
                  />
                }
                label="Implicit TLS (port 465)"
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default SystemSettings;
