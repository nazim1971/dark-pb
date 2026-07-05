import { Injectable, NotFoundException } from "@nestjs/common";
import { KycStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { buildPaginatedDataResponse } from "../common/helpers/response.helper";
import { buildPagination } from "../prisma/query-helpers";
import { KycPendingQueryDto } from "./dto/kyc-pending-query.dto";
import { SubmitKycDto } from "./dto/submit-kyc.dto";

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  async submitKyc(userId: string, dto: SubmitKycDto) {
    const existing = await this.prisma.kYC.findFirst({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!existing) {
      return this.prisma.kYC.create({
        data: {
          userId,
          documentType: dto.documentType.trim(),
          documentNumber: dto.documentNumber?.trim(),
          country: dto.country?.trim(),
          notes: dto.notes?.trim(),
          status: KycStatus.PENDING,
          submittedAt: new Date(),
        },
      });
    }

    return this.prisma.kYC.update({
      where: { id: existing.id },
      data: {
        documentType: dto.documentType.trim(),
        documentNumber: dto.documentNumber?.trim(),
        country: dto.country?.trim(),
        notes: dto.notes?.trim(),
        status: KycStatus.PENDING,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
      },
    });
  }

  async getMyStatus(userId: string) {
    const kyc = await this.prisma.kYC.findFirst({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        status: true,
        notes: true,
        submittedAt: true,
        reviewedAt: true,
      },
    });

    if (!kyc) {
      return {
        status: KycStatus.PENDING,
        notes: "KYC pending",
      };
    }

    return kyc;
  }

  async listPending(adminUser: AuthenticatedUser, query: KycPendingQueryDto) {
    const pagination = buildPagination(query);
    const where: Prisma.KYCWhereInput = {
      status: KycStatus.PENDING,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.prisma.kYC.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              legalName: true,
              stageName: true,
              registrationType: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              legalName: true,
              companyNumber: true,
              director: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: [{ submittedAt: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.kYC.count({ where }),
    ]);

    return {
      requestedBy: adminUser.userId,
      ...buildPaginatedDataResponse(data, pagination.page, pagination.limit, total),
    };
  }

  async assertApproved(userId: string): Promise<void> {
    const kyc = await this.prisma.kYC.findFirst({
      where: {
        userId,
        status: KycStatus.VERIFIED,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!kyc) {
      throw new NotFoundException("KYC is not approved");
    }
  }
}
