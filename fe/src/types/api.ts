// Generic API Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}
