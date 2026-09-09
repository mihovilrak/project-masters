import { useState, useCallback } from 'react';
import { getAvailableIcons } from '../../api/activityTypes';
import { useAsyncResource } from '../common/useAsyncResource';

const EMPTY_ICONS: string[] = [];

export const useIconSelector = (initialValue: string | undefined) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | undefined>(initialValue);

  const { data: icons, error } = useAsyncResource<string[]>(
    async (signal) => (await getAvailableIcons(signal)) || [],
    [],
    { initialData: EMPTY_ICONS, errorMessage: 'Failed to load icons' },
  );

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleSelect = useCallback((icon: string) => {
    setValue(icon);
    setOpen(false);
  }, []);

  return {
    icons,
    open,
    value,
    error,
    handleOpen,
    handleClose,
    handleSelect,
  };
};
