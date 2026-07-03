import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { REFRESH_TOKEN_COOKIE } from "./auth.constants";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { AuthTokenResponse } from "./interfaces/auth-response.interface";
import { AuthenticatedUser } from "./interfaces/token-payload.interface";
import { RequestWithAuthContext } from "./middleware/auth-request-context.middleware";
import {
  authTokenResponseSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  messageResponseSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from "./schemas/auth.zod";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { ZodResponseSchema } from "../common/validation/zod-response.decorator";

interface MessageResponse {
  message: string;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("register")
  @ApiOperation({ summary: "Register user (individual/company)" })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: "User registered", type: Object })
  @UsePipes(new ZodValidationPipe(registerRequestSchema))
  @ZodResponseSchema(authTokenResponseSchema)
  async register(
    @Body() dto: RegisterDto,
    @Req() request: RequestWithAuthContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponse> {
    const result = await this.authService.register(dto, request.authContext ?? {});

    this.setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenMaxAge);
    return result.body;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Post("login")
  @ApiOperation({ summary: "Login user" })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: "Logged in", type: Object })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  @UsePipes(new ZodValidationPipe(loginRequestSchema))
  @ZodResponseSchema(authTokenResponseSchema)
  async login(
    @Body() dto: LoginDto,
    @Req() request: RequestWithAuthContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponse> {
    const result = await this.authService.login(dto, request.authContext ?? {});

    this.setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenMaxAge);
    return result.body;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 25 } })
  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token" })
  @ApiOkResponse({ description: "Token refreshed", type: Object })
  @ZodResponseSchema(authTokenResponseSchema)
  async refresh(
    @Req() request: RequestWithAuthContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponse> {
    const refreshToken = request.signedCookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token not found");
    }

    const result = await this.authService.refresh(refreshToken, request.authContext ?? {});

    this.setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenMaxAge);
    return result.body;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  @ApiOperation({ summary: "Logout user" })
  @ApiOkResponse({ description: "Logged out" })
  @ZodResponseSchema(messageResponseSchema)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponse> {
    const refreshToken = request.signedCookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await this.authService.logout(refreshToken);
    this.clearRefreshTokenCookie(response);

    this.logger.log("User requested logout");

    return {
      message: "Logged out successfully",
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("forgot-password")
  @ApiOperation({ summary: "Request password reset" })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: "Reset request processed" })
  @UsePipes(new ZodValidationPipe(forgotPasswordRequestSchema))
  @ZodResponseSchema(messageResponseSchema)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("reset-password")
  @ApiOperation({ summary: "Reset password using token" })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: "Password reset completed" })
  @UsePipes(new ZodValidationPipe(resetPasswordRequestSchema))
  @ZodResponseSchema(messageResponseSchema)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    return this.authService.resetPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post("send-verification-email")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send email verification token" })
  @ApiOkResponse({ description: "Verification token issued" })
  @ZodResponseSchema(messageResponseSchema)
  async sendVerificationEmail(@CurrentUser() user: AuthenticatedUser): Promise<MessageResponse> {
    return this.authService.sendEmailVerification(user.userId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("verify-email")
  @ApiOperation({ summary: "Verify email using token" })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({ description: "Email verified" })
  @UsePipes(new ZodValidationPipe(verifyEmailRequestSchema))
  @ZodResponseSchema(messageResponseSchema)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<MessageResponse> {
    return this.authService.verifyEmail(dto);
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string, maxAge: number): void {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      signed: true,
      path: "/auth",
      maxAge,
    });
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      signed: true,
      path: "/auth",
    });
  }
}
