import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, User, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { UserProfileResponse } from "../auth/interfaces/auth-response.interface";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateAccountSettingsDto } from "./dto/update-account-settings.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapToProfile(user);
  }

  async getAccountSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            director: true,
            registrationNumber: true,
            vatNumber: true,
            website: true,
            country: true,
            phone: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      country: user.country,
      phone: user.phone,
      status: user.status,
      role: user.role,
      registrationType: user.registrationType,
      company: user.company,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        legalName: dto.legalName?.trim(),
        stageName: dto.stageName?.trim(),
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        country: dto.country?.trim(),
        phone: dto.phone?.trim(),
        spotifyArtistLink: dto.spotifyArtistLink?.trim(),
        pro: dto.pro?.trim(),
        ipiNumber: dto.ipiNumber?.trim(),
      },
    });

    return this.mapToProfile(updated);
  }

  async updateAccountSettings(userId: string, dto: UpdateAccountSettingsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, companyId: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const email = dto.email?.toLowerCase().trim();

    await this.prisma.runInTransaction(async (tx) => {
      if (email && email !== user.email) {
        try {
          await tx.user.update({
            where: { id: userId },
            data: {
              email,
              emailVerifiedAt: null,
            },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new ConflictException("Email already exists");
          }

          throw error;
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          country: dto.country?.trim(),
          phone: dto.phone?.trim(),
        },
      });

      if (user.companyId) {
        await tx.company.update({
          where: { id: user.companyId },
          data: {
            legalName: dto.companyLegalName?.trim(),
            director: dto.representativeName?.trim(),
            registrationNumber: dto.registrationNumber?.trim(),
            companyNumber: dto.registrationNumber?.trim(),
            vatNumber: dto.vatNumber?.trim(),
            taxId: dto.vatNumber?.trim(),
            website: dto.website?.trim(),
            country: dto.country?.trim(),
            phone: dto.phone?.trim(),
          },
        });
      }
    });

    return this.getAccountSettings(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.runInTransaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.session.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });
    });

    return {
      message: "Password changed successfully. Please log in again.",
    };
  }

  async updateUserStatus(adminUserId: string, userId: string, dto: UpdateUserStatusDto) {
    if (adminUserId === userId) {
      throw new BadRequestException("You cannot change your own status");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: dto.status,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "UPDATE",
        entityType: "USER",
        entityId: userId,
        summary: `User status changed to ${dto.status}`,
        changes: {
          previousStatus: user.status,
          newStatus: dto.status,
          reason: dto.reason ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  private mapToProfile(user: User): UserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      registrationType: user.registrationType,
      legalName: user.legalName,
      stageName: user.stageName,
      country: user.country,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      pro: user.pro,
      ipiNumber: user.ipiNumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
