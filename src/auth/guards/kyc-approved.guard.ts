import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { KycStatus, Role } from "@prisma/client";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SKIP_KYC_CHECK_KEY } from "../decorators/skip-kyc-check.decorator";
import { AuthenticatedUser } from "../interfaces/token-payload.interface";

@Injectable()
export class KycApprovedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const skipKyc = this.reflector.getAllAndOverride<boolean>(SKIP_KYC_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipKyc) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      return true;
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
      return true;
    }

    const approvedKyc = await this.prisma.kYC.findFirst({
      where: {
        userId: user.userId,
        status: KycStatus.VERIFIED,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!approvedKyc) {
      throw new ForbiddenException(
        "Your account is pending KYC approval. Actions are disabled until admin approval.",
      );
    }

    return true;
  }
}
