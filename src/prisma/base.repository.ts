import { Prisma } from "@prisma/client";

export interface RepositoryDelegate<
  TEntity,
  TWhereUnique extends Record<string, unknown>,
  TWhere extends Record<string, unknown>,
  TCreate extends Record<string, unknown>,
  TUpdate extends Record<string, unknown>,
> {
  findUnique(args: { where: TWhereUnique }): Promise<TEntity | null>;
  findFirst(args: { where: TWhere }): Promise<TEntity | null>;
  findMany(args?: {
    where?: TWhere;
    orderBy?: Prisma.Enumerable<Record<string, Prisma.SortOrder>>;
    skip?: number;
    take?: number;
  }): Promise<TEntity[]>;
  count(args?: { where?: TWhere }): Promise<number>;
  create(args: { data: TCreate }): Promise<TEntity>;
  update(args: { where: TWhereUnique; data: TUpdate }): Promise<TEntity>;
  updateMany(args: { where?: TWhere; data: TUpdate }): Promise<{ count: number }>;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<TEntity> {
  data: TEntity[];
  meta: PaginationMeta;
}

export abstract class BaseRepository<
  TEntity,
  TWhereUnique extends Record<string, unknown>,
  TWhere extends Record<string, unknown>,
  TCreate extends Record<string, unknown>,
  TUpdate extends Record<string, unknown>,
> {
  protected constructor(
    protected readonly delegate: RepositoryDelegate<
      TEntity,
      TWhereUnique,
      TWhere,
      TCreate,
      TUpdate
    >,
  ) {}

  async findById(where: TWhereUnique): Promise<TEntity | null> {
    return this.delegate.findUnique({ where });
  }

  async findOne(where: TWhere): Promise<TEntity | null> {
    return this.delegate.findFirst({ where });
  }

  async findMany(options?: {
    where?: TWhere;
    orderBy?: Prisma.Enumerable<Record<string, Prisma.SortOrder>>;
    skip?: number;
    take?: number;
  }): Promise<TEntity[]> {
    return this.delegate.findMany(options);
  }

  async paginate(
    where: TWhere,
    pagination: PaginationInput,
    orderBy?: Prisma.Enumerable<Record<string, Prisma.SortOrder>>,
  ): Promise<PaginatedResult<TEntity>> {
    const page = Math.max(1, pagination.page ?? 1);
    const limit = Math.max(1, Math.min(100, pagination.limit ?? 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.delegate.findMany({ where, orderBy, skip, take: limit }),
      this.delegate.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async create(data: TCreate): Promise<TEntity> {
    return this.delegate.create({ data });
  }

  async update(where: TWhereUnique, data: TUpdate): Promise<TEntity> {
    return this.delegate.update({ where, data });
  }

  async softDelete(where: TWhere): Promise<{ count: number }> {
    return this.delegate.updateMany({
      where,
      data: { deletedAt: new Date() } as unknown as TUpdate,
    });
  }
}
