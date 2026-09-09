export interface Permission {
  id: number;
  name: string;
  created_on?: string;
}

export interface PrivateRouteProps {
  element?: React.ReactElement;
  requiredPermission?: string;
}

export type ThemeContextType = {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
};
