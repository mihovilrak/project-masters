import { ReactNode, Dispatch, SetStateAction } from 'react';
import { ButtonProps, TooltipProps } from '@mui/material';

export interface PermissionButtonProps extends Omit<ButtonProps, 'children'> {
  requiredPermission: string;
  children: ReactNode;
  tooltipText?: string;
  showLoading?: boolean;
  placement?: TooltipProps['placement'];
}



export interface DeleteConfirmDialogProps {
  open: boolean;
  title?: string;
  content?: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string;
}

export interface UsePermissionResult {
  hasPermission: boolean;
  loading: boolean;
}

export interface AsyncResourceOptions<T> {
  initialData: T;
  /** When false the fetcher is skipped and `loading` stays false. */
  enabled?: boolean;
  errorMessage?: string;
}

export interface AsyncResource<T> {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  refetch: () => Promise<void>;
}
