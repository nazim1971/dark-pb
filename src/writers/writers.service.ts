import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { buildPaginatedItemsResponse } from "../common/helpers/response.helper";
import { PrismaService } from "../prisma/prisma.service";
import { buildPagination, buildSearchContainsFilter } from "../prisma/query-helpers";
import { CreateWriterDto } from "./dto/create-writer.dto";
import { UpdateWriterDto } from "./dto/update-writer.dto";
import { WriterQueryDto } from "./dto/writer-query.dto";

@Injectable()
export class WritersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateWriterDto) {
    return this.prisma.writer.create({
      data: {
        userId: user.role === Role.ADMIN ? dto.userId : user.userId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        legalName: this.toLegalName(dto.firstName, dto.lastName),
        pro: dto.pro?.trim(),
        ipiNumber: dto.ipiNumber?.trim(),
        dob: dto.dob ? new Date(dto.dob) : undefined,
      },
    });
  }

  async list(user: AuthenticatedUser, query: WriterQueryDto) {
    const pagination = buildPagination(query);

    const where: Prisma.WriterWhereInput = {
      ...(user.role === Role.ADMIN ? {} : { userId: user.userId }),
      ...(user.role === Role.ADMIN && query.userId ? { userId: query.userId } : {}),
      ...(query.pro
        ? {
            pro: {
              equals: query.pro,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.ipiNumber
        ? {
            ipiNumber: {
              equals: query.ipiNumber,
            },
          }
        : {}),
      ...buildSearchContainsFilter(
        ["firstName", "lastName", "legalName", "ipiNumber", "pro"],
        query.q,
      ),
    };

    const [items, total] = await Promise.all([
      this.prisma.writer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.writer.count({ where }),
    ]);

    return buildPaginatedItemsResponse(items, pagination.page, pagination.limit, total);
  }

  async getById(user: AuthenticatedUser, id: string) {
    const writer = await this.prisma.writer.findUnique({ where: { id } });
    if (!writer) {
      throw new NotFoundException("Writer not found");
    }

    this.assertCanAccess(user, writer.userId);
    return writer;
  }

  async update(user: AuthenticatedUser, dto: UpdateWriterDto) {
    const writer = await this.prisma.writer.findUnique({ where: { id: dto.id } });
    if (!writer) {
      throw new NotFoundException("Writer not found");
    }

    this.assertCanAccess(user, writer.userId);

    const firstName = dto.firstName?.trim() ?? writer.firstName ?? "";
    const lastName = dto.lastName?.trim() ?? writer.lastName ?? "";

    return this.prisma.writer.update({
      where: { id: dto.id },
      data: {
        userId: user.role === Role.ADMIN ? (dto.userId ?? writer.userId) : writer.userId,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        legalName:
          dto.firstName !== undefined || dto.lastName !== undefined
            ? this.toLegalName(firstName, lastName)
            : writer.legalName,
        pro: dto.pro?.trim(),
        ipiNumber: dto.ipiNumber?.trim(),
        dob: dto.dob ? new Date(dto.dob) : dto.dob === null ? null : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const writer = await this.prisma.writer.findUnique({ where: { id } });
    if (!writer) {
      throw new NotFoundException("Writer not found");
    }

    this.assertCanAccess(user, writer.userId);
    return this.prisma.writer.delete({ where: { id } });
  }

  private assertCanAccess(user: AuthenticatedUser, ownerId?: string | null): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (!ownerId || ownerId !== user.userId) {
      throw new ForbiddenException("You can only access your own writers");
    }
  }

  private toLegalName(firstName: string, lastName: string): string {
    return `${firstName.trim()} ${lastName.trim()}`.trim();
  }
}
