export interface UserStatus {
  id: number;
  name: string;
  color?: string;
}

export interface User {
  id: number;
  login: string;
  name: string;
  surname: string;
  avatar_url?: string | null;
  email: string;
  role_id: number;
  role_name?: string;
  status_id: number;
  status_name?: string;
  status_color?: string;
  created_on: string;
  updated_on: string | null;
  last_login?: string | null;
}

export interface UserDetails extends User {
  status: string;
  role: string;
  last_login: string | null;
  full_name?: string;
  permissions?: number[];
}

export interface UserCreate {
  login: string;
  password: string;
  name: string;
  surname: string;
  email: string;
  role_id: number;
  status_id?: number;
}

export interface UserUpdate {
  id: number;
  login?: string;
  password?: string;
  currentPassword?: string;
  name?: string;
  surname?: string;
  email?: string;
  role_id?: number;
  status_id?: number;
}

export interface UserFormData {
  login: string;
  name: string;
  surname: string;
  email: string;
  password: string;
  currentPassword?: string;
  confirmPassword?: string;
  role_id: number;
  status_id?: number;
}

export interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onUserSaved: (user: User) => void;
}

export interface UserDetailsState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface UserFormProps {
  userId?: string;
}
