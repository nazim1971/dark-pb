import { Body, Controller, Get, Post, Query, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { SkipKycCheck } from "../auth/decorators/skip-kyc-check.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { KycPendingQueryDto } from "./dto/kyc-pending-query.dto";
import { SubmitKycDto } from "./dto/submit-kyc.dto";
import { kycPendingQuerySchema, submitKycSchema } from "./schemas/kyc.zod";
import { KycService } from "./kyc.service";

@ApiTags("KYC")
@ApiBearerAuth()
@Controller("kyc")
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post("submit")
  @SkipKycCheck()
  @ApiOperation({ summary: "Submit or resubmit current user KYC" })
  @ApiOkResponse({ description: "KYC submitted" })
  @UsePipes(new ZodValidationPipe(submitKycSchema))
  async submitKyc(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitKycDto) {
    return this.kycService.submitKyc(user.userId, dto);
  }

  @Get("me")
  @ApiOperation({ summary: "Get authenticated user KYC status" })
  @ApiOkResponse({ description: "KYC status returned" })
  async getMyStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.kycService.getMyStatus(user.userId);
  }

  @Get("pending")
  @Roles("ADMIN")
  @ApiOperation({ summary: "List pending KYC records" })
  @ApiOkResponse({ description: "Pending KYC list returned" })
  @UsePipes(new ZodValidationPipe(kycPendingQuerySchema))
  async listPending(@CurrentUser() user: AuthenticatedUser, @Query() query: KycPendingQueryDto) {
    return this.kycService.listPending(user, query);
  }
}
