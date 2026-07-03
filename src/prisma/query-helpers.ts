import { Prisma } from "@prisma/client";

export interface PaginationArgs {
  page?: number;
  limit?: number;
}

export interface PaginationQuery {
  skip: number;
  take: number;
}

export function buildPagination(args?: PaginationArgs): PaginationQuery {
  const page = Math.max(1, args?.page ?? 1);
  const limit = Math.max(1, Math.min(100, args?.limit ?? 20));

  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function withSoftDeleteFilter(where?: Record<string, unknown>): Record<string, unknown> {
  if (!where) {
    return { deletedAt: null };
  }

  return {
    AND: [where, { deletedAt: null }],
  };
}

export function buildSortOrder(
  sortBy: string,
  direction: Prisma.SortOrder = "desc",
): Record<string, Prisma.SortOrder> {
  return {
    [sortBy]: direction,
  };
}

export function buildDateRangeFilter(
  field: string,
  from?: Date,
  to?: Date,
): Record<string, unknown> {
  const range: Record<string, Date> = {};

  if (from) {
    range.gte = from;
  }

  if (to) {
    range.lte = to;
  }

  if (Object.keys(range).length === 0) {
    return {};
  }

  return {
    [field]: range,
  };
}

export function buildSearchContainsFilter(
  fields: string[],
  term?: string,
): Record<string, unknown> {
  if (!term) {
    return {};
  }

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: term,
        mode: "insensitive",
      },
    })),
  };
}
