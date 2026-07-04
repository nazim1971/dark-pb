import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  CompanyType,
  KycStatus,
  Prisma,
  RegistrationType as PrismaRegistrationType,
  Role,
  User,
} from "@prisma/client";
import { compare, hash } from "bcryptjs";
import ms from "ms";
import { randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto, RegistrationRole, RegistrationType } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { AuthTokenResponse, UserProfileResponse } from "./interfaces/auth-response.interface";
import { AccessTokenPayload, RefreshTokenPayload } from "./interfaces/token-payload.interface";

interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}

interface AuthOperationResult {
  body: AuthTokenResponse;
  refreshToken: string;
  refreshTokenMaxAge: number;
}

interface MessageResponse {
  message: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, metadata: RequestMetadata): Promise<AuthOperationResult> {
    if (!Object.values(RegistrationRole).includes(dto.role)) {
      throw new BadRequestException("Invalid registration role");
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const passwordHash = await this.hashValue(dto.password);

    try {
      const user = await this.prisma.runInTransaction(async (tx) => {
        let companyId: string | undefined;
        const registrationType = dto.registrationType as PrismaRegistrationType;

        if (dto.registrationType === RegistrationType.COMPANY) {
          if (!dto.companyName) {
            throw new BadRequestException("companyName is required for company registration");
          }

          const company = await tx.company.create({
            data: {
              name: dto.companyName,
              legalName: dto.companyName,
              companyNumber: dto.companyNumber,
              address: dto.address,
              director: dto.director,
              email: dto.companyEmail ?? normalizedEmail,
              phone: dto.companyPhone,
              registrationNumber: dto.companyNumber,
              type: dto.companyType ?? this.inferCompanyType(dto.role),
            },
          });

          companyId = company.id;
        }

        const { firstName, lastName } = this.resolveUserNames(dto);

        const createdUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            legalName: dto.legalName?.trim(),
            stageName: dto.stageName?.trim(),
            firstName,
            lastName,
            country: dto.country?.trim(),
            phone: dto.phone?.trim(),
            spotifyArtistLink: dto.spotifyArtistLink?.trim(),
            pro: dto.pro?.trim(),
            ipiNumber: dto.ipiNumber?.trim(),
            role: dto.role as Role,
            registrationType,
            companyId,
          },
        });

        await tx.kYC.create({
          data: {
            userId: createdUser.id,
            companyId,
            documentType: "MANUAL_REVIEW",
            country: dto.country?.trim(),
            status: KycStatus.PENDING,
            notes: "Created automatically during registration",
          },
        });

        return createdUser;
      });

      await this.issueEmailVerificationToken(user.id, user.email);
      return this.issueFreshSession(user, metadata);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Email already exists");
      }

      throw error;
    }
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthOperationResult> {
    const user = await this.validateCredentials(dto.email, dto.password);
    return this.issueFreshSession(user, metadata);
  }

  async refresh(refreshToken: string, metadata: RequestMetadata): Promise<AuthOperationResult> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    if (!session || session.userId !== payload.sub) {
      this.logger.error(`Refresh session not found or subject mismatch for user ${payload.sub}`);
      await this.revokeAllUserSessions(payload.sub, true);
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (session.revokedAt || session.compromisedAt || session.expiresAt <= new Date()) {
      this.logger.error(`Refresh token reuse detected for user ${session.userId}`);
      await this.revokeAllUserSessions(session.userId, true);
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    const tokenMatches = await this.verifyValue(refreshToken, session.refreshTokenHash);
    if (!tokenMatches) {
      this.logger.error(`Refresh token hash mismatch for session ${session.id}`);
      await this.revokeAllUserSessions(session.userId, true);
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    return this.rotateSession(session.id, session.user, metadata);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const payload = await this.verifyRefreshTokenLenient(refreshToken);
    if (!payload) {
      return;
    }

    await this.prisma.session.updateMany({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponse> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: "If an account exists, a password reset link has been sent." };
    }

    const rawToken = this.generateToken();
    const tokenHash = await this.hashValue(rawToken);
    const expiresAt = new Date(Date.now() + this.getPasswordResetExpirationMs());

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    this.logger.log(`Password reset token issued for ${user.email}: ${rawToken}`);

    return { message: "If an account exists, a password reset link has been sent." };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponse> {
    const users = await this.prisma.user.findMany({
      where: {
        passwordResetExpiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        passwordResetTokenHash: true,
      },
    });

    const matched = await this.findUserByHashedToken(users, dto.token, "passwordResetTokenHash");

    if (!matched) {
      throw new UnauthorizedException("Invalid or expired reset token");
    }

    await this.prisma.user.update({
      where: { id: matched.id },
      data: {
        passwordHash: await this.hashValue(dto.newPassword),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    await this.revokeAllUserSessions(matched.id, false);

    return {
      message: "Password has been reset successfully.",
    };
  }

  async sendEmailVerification(userId: string): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (user.emailVerifiedAt) {
      return { message: "Email is already verified." };
    }

    await this.issueEmailVerificationToken(user.id, user.email);

    return { message: "Verification email has been sent." };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<MessageResponse> {
    const users = await this.prisma.user.findMany({
      where: {
        emailVerificationExpiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        emailVerificationTokenHash: true,
      },
    });

    const matched = await this.findUserByHashedToken(
      users,
      dto.token,
      "emailVerificationTokenHash",
    );

    if (!matched) {
      throw new UnauthorizedException("Invalid or expired verification token");
    }

    await this.prisma.user.update({
      where: { id: matched.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    return {
      message: "Email verified successfully.",
    };
  }

  private async validateCredentials(email: string, password: string): Promise<User> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for unknown email ${normalizedEmail}`);
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValidPassword = await this.verifyValue(password, user.passwordHash);
    if (!isValidPassword) {
      this.logger.warn(`Failed login attempt for user ${user.id}`);
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  private resolveUserNames(dto: RegisterDto): { firstName: string; lastName: string } {
    const source =
      dto.legalName?.trim() ||
      dto.director?.trim() ||
      dto.companyName?.trim() ||
      dto.email.split("@")[0];

    const parts = source.split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return { firstName: "User", lastName: "" };
    }

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "Account" };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }

  private async issueFreshSession(
    user: User,
    metadata: RequestMetadata,
  ): Promise<AuthOperationResult> {
    const refreshSessionId = randomUUID();
    const signedTokens = await this.signTokenPair(user, refreshSessionId);
    const refreshTokenHash = await this.hashValue(signedTokens.refreshToken);

    await this.prisma.session.create({
      data: {
        id: refreshSessionId,
        userId: user.id,
        refreshTokenHash,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        expiresAt: signedTokens.refreshTokenExpiresAt,
      },
    });

    return {
      body: {
        accessToken: signedTokens.accessToken,
        tokenType: "Bearer",
        expiresIn: this.configService.getOrThrow<string>("JWT_ACCESS_EXPIRATION"),
        user: this.toUserProfile(user),
      },
      refreshToken: signedTokens.refreshToken,
      refreshTokenMaxAge: signedTokens.refreshTokenMaxAge,
    };
  }

  private async rotateSession(
    previousSessionId: string,
    user: User,
    metadata: RequestMetadata,
  ): Promise<AuthOperationResult> {
    const replacementSessionId = randomUUID();
    const signedTokens = await this.signTokenPair(user, replacementSessionId);
    const refreshTokenHash = await this.hashValue(signedTokens.refreshToken);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.session.updateMany({
        where: {
          id: previousSessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          replacedById: replacementSessionId,
          lastUsedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        throw new UnauthorizedException("Refresh token reuse detected");
      }

      await tx.session.create({
        data: {
          id: replacementSessionId,
          userId: user.id,
          refreshTokenHash,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          expiresAt: signedTokens.refreshTokenExpiresAt,
        },
      });
    });

    return {
      body: {
        accessToken: signedTokens.accessToken,
        tokenType: "Bearer",
        expiresIn: this.configService.getOrThrow<string>("JWT_ACCESS_EXPIRATION"),
        user: this.toUserProfile(user),
      },
      refreshToken: signedTokens.refreshToken,
      refreshTokenMaxAge: signedTokens.refreshTokenMaxAge,
    };
  }

  private async revokeAllUserSessions(userId: string, markCompromised: boolean): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        compromisedAt: markCompromised ? new Date() : null,
      },
    });
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private async verifyRefreshTokenLenient(token: string): Promise<RefreshTokenPayload | null> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      const decoded = this.jwtService.decode(token);
      if (!decoded || typeof decoded !== "object") {
        return null;
      }

      const payload = decoded as Partial<RefreshTokenPayload>;
      if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
        return null;
      }

      return {
        sub: payload.sub,
        sid: payload.sid,
      };
    }
  }

  private async signTokenPair(
    user: User,
    refreshSessionId: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
    refreshTokenMaxAge: number;
  }> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: refreshSessionId,
    };

    const accessExpiration = this.configService.getOrThrow<string>("JWT_ACCESS_EXPIRATION");
    const refreshExpiration = this.configService.getOrThrow<string>("JWT_REFRESH_EXPIRATION");
    const refreshTokenMaxAge = this.getExpirationInMilliseconds(refreshExpiration);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: accessExpiration,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: refreshExpiration,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: new Date(Date.now() + refreshTokenMaxAge),
      refreshTokenMaxAge,
    };
  }

  private getExpirationInMilliseconds(expiration: string): number {
    const value = ms(expiration);
    if (typeof value !== "number" || value <= 0) {
      throw new Error(`Invalid expiration value: ${expiration}`);
    }

    return value;
  }

  private inferCompanyType(role: RegistrationRole): CompanyType {
    if (role === RegistrationRole.PUBLISHER) {
      return CompanyType.PUBLISHER;
    }

    if (role === RegistrationRole.RECORD_LABEL) {
      return CompanyType.RECORD_LABEL;
    }

    return CompanyType.OTHER;
  }

  private async hashValue(value: string): Promise<string> {
    return hash(value, this.getBcryptRounds());
  }

  private async verifyValue(value: string, hashValue: string): Promise<boolean> {
    return compare(value, hashValue);
  }

  private getBcryptRounds(): number {
    const rounds = this.configService.get<number>("BCRYPT_ROUNDS");
    if (!rounds || rounds < 8) {
      return 12;
    }

    return rounds;
  }

  private generateToken(): string {
    return `${randomUUID()}-${randomBytes(32).toString("hex")}`;
  }

  private getPasswordResetExpirationMs(): number {
    const minutes = this.configService.get<number>("PASSWORD_RESET_TOKEN_EXP_MINUTES") ?? 30;
    return minutes * 60 * 1000;
  }

  private getEmailVerificationExpirationMs(): number {
    const hours = this.configService.get<number>("EMAIL_VERIFICATION_TOKEN_EXP_HOURS") ?? 24;
    return hours * 60 * 60 * 1000;
  }

  private async issueEmailVerificationToken(userId: string, email: string): Promise<void> {
    const rawToken = this.generateToken();
    const tokenHash = await this.hashValue(rawToken);
    const expiresAt = new Date(Date.now() + this.getEmailVerificationExpirationMs());

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    this.logger.log(`Email verification token issued for ${email}: ${rawToken}`);
  }

  private async findUserByHashedToken<T extends { id: string }>(
    records: Array<T & { [key: string]: string | null }>,
    token: string,
    field: string,
  ): Promise<T | null> {
    for (const record of records) {
      const hashValue = record[field];
      if (!hashValue) {
        continue;
      }

      const matched = await this.verifyValue(token, hashValue);
      if (matched) {
        return record;
      }
    }

    return null;
  }

  private toUserProfile(user: User): UserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
