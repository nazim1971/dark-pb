import { DEFAULT_LIMIT, DEFAULT_PAGE } from "../../shared/constants/pagination.constants";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface PaginatedItemsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
  includeTotalPages = false,
): PaginationMeta {
  const meta: PaginationMeta = { page, limit, total };

  if (includeTotalPages) {
    meta.totalPages = Math.max(1, Math.ceil(total / limit));
  }

  return meta;
}

export function resolvePageLimit(
  args?: { page?: number; limit?: number },
  includeTotalPages = false,
): { page: number; limit: number; meta: (total: number) => PaginationMeta } {
  const page = Math.max(1, args?.page ?? DEFAULT_PAGE);
  const limit = Math.max(1, Math.min(100, args?.limit ?? DEFAULT_LIMIT));

  return {
    page,
    limit,
    meta: (total: number) => buildPaginationMeta(page, limit, total, includeTotalPages),
  };
}

export function buildPaginatedDataResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): { data: T[]; meta: PaginationMeta } {
  return {
    data,
    meta: buildPaginationMeta(page, limit, total),
  };
}

export function buildPaginatedItemsResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): { items: T[]; meta: PaginatedItemsMeta } {
  return {
    items,
    meta: buildPaginationMeta(page, limit, total, true) as PaginatedItemsMeta,
  };
}
