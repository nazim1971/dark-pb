import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UsePipes } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { SkipKycCheck } from "../auth/decorators/skip-kyc-check.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { UserProfileResponse } from "../auth/interfaces/auth-response.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateAccountSettingsDto } from "./dto/update-account-settings.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import {
  changePasswordSchema,
  updateAccountSettingsSchema,
  updateProfileSchema,
  updateUserStatusSchema,
} from "./schemas/users.zod";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiBearerAuth()
@SkipKycCheck()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileResponse> {
    return this.usersService.getMe(user.userId);
  }

  @Get("me/account-settings")
  @ApiOperation({ summary: "Get current user account settings" })
  @ApiOkResponse({ description: "Account settings returned" })
  async getAccountSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getAccountSettings(user.userId);
  }

  @Patch("me/profile")
  @ApiOperation({ summary: "Update current user profile" })
  @ApiBody({ type: UpdateProfileDto })
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Patch("me/account-settings")
  @ApiOperation({ summary: "Update current user account settings" })
  @ApiBody({ type: UpdateAccountSettingsDto })
  @UsePipes(new ZodValidationPipe(updateAccountSettingsSchema))
  async updateAccountSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAccountSettingsDto,
  ) {
    return this.usersService.updateAccountSettings(user.userId, dto);
  }

  @Patch("me/change-password")
  @ApiOperation({ summary: "Change current user password" })
  @ApiBody({ type: ChangePasswordDto })
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Suspend or activate user" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateUserStatusDto })
  @UsePipes(new ZodValidationPipe(updateUserStatusSchema))
  async updateUserStatus(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(adminUser.userId, userId, dto);
  }
}
