import { Prisma } from "@prisma/client";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from "../shared/constants/pagination.constants";

export interface PaginationArgs {
  page?: number;
  limit?: number;
}

export interface PaginationQuery {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function buildPagination(args?: PaginationArgs): PaginationQuery {
  const page = Math.max(1, args?.page ?? DEFAULT_PAGE);
  const limit = Math.max(1, Math.min(MAX_LIMIT, args?.limit ?? DEFAULT_LIMIT));

  return {
    page,
    limit,
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

export function buildPrismaDateRangeFilter(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

export function buildSearchContainsFilter(
  fields: string[],
  term?: string,
): Record<string, unknown> {
  if (!term?.trim()) {
    return {};
  }

  const normalized = term.trim();

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: normalized,
        mode: "insensitive",
      },
    })),
  };
}

export function mergeWhereClauses(
  ...clauses: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  const defined = clauses.filter(
    (clause): clause is Record<string, unknown> =>
      clause !== undefined && Object.keys(clause).length > 0,
  );

  if (defined.length === 0) {
    return {};
  }

  if (defined.length === 1) {
    return defined[0];
  }

  return { AND: defined };
}
