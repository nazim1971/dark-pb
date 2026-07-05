export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: unknown;
}
