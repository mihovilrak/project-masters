import { useState, useEffect } from 'react';
import {
  AppSettings,
  SystemSettingsState,
  TimezoneOption,
} from '../../types/setting';
import {
  getSystemSettings,
  updateSystemSettings,
  getTimezones,
} from '../../api/settings';

export const useSystemSettings = () => {
  const [state, setState] = useState<SystemSettingsState>({
    settings: {
      id: 1,
      app_name: '',
      company_name: '',
      sender_email: '',
      time_zone: '',
      theme: 'system',
      welcome_message: '',
      app_base_url: '',
      log_level: 'info',
      email_enabled: false,
      email_host: '',
      email_port: 587,
      email_secure: false,
    },
    loading: true,
    error: null,
    success: false,
  });

  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [timezonesLoading, setTimezonesLoading] = useState<boolean>(false);
  const [timezonesError, setTimezonesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSystemSettings();
        setState((prev) => ({
          ...prev,
          settings: data,
          loading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: 'Failed to fetch system settings',
          loading: false,
        }));
      }
    };

    const fetchTimezones = async () => {
      try {
        setTimezonesLoading(true);
        setTimezonesError(null);
        const data = await getTimezones();
        setTimezones(data || []);
      } catch (error) {
        setTimezones([]);
        setTimezonesError('Failed to load timezones');
      } finally {
        setTimezonesLoading(false);
      }
    };

    fetchSettings();
    fetchTimezones();
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      setState((prev) => ({ ...prev, loading: true }));
      await updateSystemSettings(state.settings);
      setState((prev) => ({
        ...prev,
        success: true,
        loading: false,
      }));
      setTimeout(() => setState((prev) => ({ ...prev, success: false })), 3000);

      // Dispatch event to notify ThemeContext about theme update
      if (state.settings.theme) {
        // Dispatch custom event for same tab
        window.dispatchEvent(new Event('appThemeUpdated'));
        // Dispatch storage event for other tabs
        localStorage.setItem('appThemeUpdated', Date.now().toString());
        localStorage.removeItem('appThemeUpdated');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to update system settings',
        loading: false,
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, [name]: value },
    }));
  };

  // Non-string fields (ports, switches) cannot go through handleChange.
  const setField = <K extends keyof AppSettings>(
    name: K,
    value: AppSettings[K],
  ): void => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, [name]: value },
    }));
  };

  return {
    state,
    timezones,
    timezonesLoading,
    timezonesError,
    handleSubmit,
    handleChange,
    setField,
  };
};
