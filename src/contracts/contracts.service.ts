import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { PrismaService } from "../prisma/prisma.service";
import { buildPagination } from "../prisma/query-helpers";
import { AttachContractCompositionsDto } from "./dto/attach-contract-compositions.dto";
import { ContractActionDto } from "./dto/contract-action.dto";
import { ContractQueryDto } from "./dto/contract-query.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";

type ContractWithRelations = Prisma.ContractGetPayload<{
  include: {
    company: { select: { id: true; name: true } };
    publisher: { select: { id: true; publisherName: true } };
    createdBy: { select: { id: true; firstName: true; lastName: true; email: true } };
    compositions: {
      include: {
        composition: { select: { id: true; songTitle: true; status: true } };
      };
    };
  };
}>;

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateContractDto) {
    this.assertEffectiveDates(dto.effectiveFrom, dto.effectiveTo);

    const contract = await this.prisma.contract.create({
      data: {
        contractNo: dto.contractNo,
        title: dto.title,
        type: dto.type,
        status: dto.status ?? ContractStatus.DRAFT,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo,
        companyId: dto.companyId,
        publisherId: dto.publisherId,
        createdById: user.userId,
      },
      include: this.contractInclude,
    });

    return this.mapContract(contract);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateContractDto) {
    const existing = await this.getExistingContract(id);
    this.assertCanManageContract(user, existing);

    const effectiveFrom = dto.effectiveFrom ?? existing.effectiveFrom;
    const effectiveTo = dto.effectiveTo ?? existing.effectiveTo ?? undefined;
    this.assertEffectiveDates(effectiveFrom, effectiveTo);

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        contractNo: dto.contractNo,
        title: dto.title,
        type: dto.type,
        status: dto.status,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo,
        companyId: dto.companyId,
        publisherId: dto.publisherId,
      },
      include: this.contractInclude,
    });

    return this.mapContract(updated);
  }

  async approve(user: AuthenticatedUser, id: string, action: ContractActionDto) {
    void action;
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException("Admin role is required to approve contracts");
    }

    await this.getExistingContract(id);

    const approved = await this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.ACTIVE,
      },
      include: this.contractInclude,
    });

    return this.mapContract(approved);
  }

  async attachToCompositions(
    user: AuthenticatedUser,
    id: string,
    dto: AttachContractCompositionsDto,
  ) {
    const contract = await this.getExistingContract(id);
    this.assertCanManageContract(user, contract);

    const compositionIds = dto.compositions.map((item) => item.compositionId);
    const existingCompositions = await this.prisma.composition.findMany({
      where: {
        id: { in: compositionIds },
      },
      select: { id: true },
    });

    if (existingCompositions.length !== compositionIds.length) {
      throw new BadRequestException("One or more compositions are invalid");
    }

    await this.prisma.runInTransaction(async (tx) => {
      await Promise.all(
        dto.compositions.map((item) =>
          tx.contractComposition.upsert({
            where: {
              contractId_compositionId: {
                contractId: id,
                compositionId: item.compositionId,
              },
            },
            create: {
              contractId: id,
              compositionId: item.compositionId,
              territory: item.territory,
              sharePercentage:
                item.sharePercentage === undefined
                  ? undefined
                  : new Prisma.Decimal(item.sharePercentage.toFixed(2)),
            },
            update: {
              territory: item.territory,
              sharePercentage:
                item.sharePercentage === undefined
                  ? undefined
                  : new Prisma.Decimal(item.sharePercentage.toFixed(2)),
              deletedAt: null,
            },
          }),
        ),
      );
    });

    return this.getById(user, id);
  }

  async getById(user: AuthenticatedUser, id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: this.contractInclude,
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    this.assertCanAccessContract(user, contract);
    return this.mapContract(contract);
  }

  async list(user: AuthenticatedUser, query: ContractQueryDto) {
    const where = this.buildWhere(user, query);
    const pagination = buildPagination(query);

    const [rows, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: this.contractInclude,
        orderBy: [{ createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.mapContract(row)),
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
      },
    };
  }

  private readonly contractInclude = {
    company: { select: { id: true, name: true } },
    publisher: { select: { id: true, publisherName: true } },
    createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    compositions: {
      include: {
        composition: { select: { id: true, songTitle: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    },
  } satisfies Prisma.ContractInclude;

  private async getExistingContract(id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    return contract;
  }

  private buildWhere(user: AuthenticatedUser, query: ContractQueryDto): Prisma.ContractWhereInput {
    const where: Prisma.ContractWhereInput = {};

    if (query.title) {
      where.title = {
        contains: query.title,
        mode: "insensitive",
      };
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.publisherId) {
      where.publisherId = query.publisherId;
    }

    if (query.song) {
      where.compositions = {
        some: {
          composition: {
            songTitle: {
              contains: query.song,
              mode: "insensitive",
            },
          },
        },
      };
    }

    if (query.year) {
      const start = new Date(Date.UTC(query.year, 0, 1));
      const end = new Date(Date.UTC(query.year, 11, 31, 23, 59, 59, 999));
      where.effectiveFrom = {
        gte: start,
        lte: end,
      };
    }

    if (user.role !== Role.ADMIN) {
      where.OR = [{ createdById: user.userId }];
    }

    return where;
  }

  private assertCanManageContract(
    user: AuthenticatedUser,
    contract: { createdById: string },
  ): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (contract.createdById !== user.userId) {
      throw new ForbiddenException("You can only manage your own contracts");
    }
  }

  private assertCanAccessContract(
    user: AuthenticatedUser,
    contract: { createdById: string },
  ): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (contract.createdById !== user.userId) {
      throw new ForbiddenException("You can only access your own contracts");
    }
  }

  private assertEffectiveDates(effectiveFrom: Date, effectiveTo?: Date): void {
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException("effectiveTo must be on or after effectiveFrom");
    }
  }

  private mapContract(contract: ContractWithRelations) {
    return {
      id: contract.id,
      contractNo: contract.contractNo,
      title: contract.title,
      type: contract.type,
      status: contract.status,
      effectiveFrom: contract.effectiveFrom,
      effectiveTo: contract.effectiveTo,
      company: contract.company,
      publisher: contract.publisher,
      createdBy: {
        id: contract.createdBy.id,
        name: `${contract.createdBy.firstName} ${contract.createdBy.lastName}`.trim(),
        email: contract.createdBy.email,
      },
      compositionCount: contract.compositions.length,
      compositions: contract.compositions.map((item) => ({
        id: item.id,
        compositionId: item.compositionId,
        songTitle: item.composition.songTitle,
        territory: item.territory,
        sharePercentage: item.sharePercentage ? Number(item.sharePercentage) : null,
      })),
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }
}
