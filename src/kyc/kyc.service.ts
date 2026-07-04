import { Injectable, NotFoundException } from "@nestjs/common";
import { KycStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { KycPendingQueryDto } from "./dto/kyc-pending-query.dto";

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

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
    const where: Prisma.KYCWhereInput = {
      status: KycStatus.PENDING,
      deletedAt: null,
    };

    const skip = (query.page - 1) * query.limit;

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
        skip,
        take: query.limit,
      }),
      this.prisma.kYC.count({ where }),
    ]);

    return {
      requestedBy: adminUser.userId,
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async assertApproved(userId: string): Promise<void> {
    const kyc = await this.prisma.kYC.findFirst({
      where: {
        userId,
        status: KycStatus.APPROVED,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!kyc) {
      throw new NotFoundException("KYC is not approved");
    }
  }
}
