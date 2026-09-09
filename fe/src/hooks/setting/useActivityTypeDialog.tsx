import { useState, useEffect } from 'react';
import { ActivityType } from '../../types/setting';
import { ActivityTypeFormData } from '../../types/setting';

export const useActivityTypeDialog = (
  activityType: ActivityType | undefined,
) => {
  const [formData, setFormData] = useState<ActivityTypeFormData>({
    name: '',
    color: '#2196f3',
    description: '',
    active: true,
    icon: undefined,
  });
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (activityType) {
      setFormData({
        name: activityType.name,
        color: activityType.color,
        description: activityType.description || '',
        active: activityType.active,
        icon: activityType.icon ?? undefined,
      });
    } else {
      setFormData({
        name: '',
        color: '#2196f3',
        description: '',
        active: true,
        icon: undefined,
      });
    }
  }, [activityType]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearError = () => setError(undefined);

  return {
    formData,
    error,
    handleChange,
    setError,
    clearError,
  };
};
