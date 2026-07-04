import { Controller, Get, Query, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { KycPendingQueryDto } from "./dto/kyc-pending-query.dto";
import { kycPendingQuerySchema } from "./schemas/kyc.zod";
import { KycService } from "./kyc.service";

@ApiTags("KYC")
@ApiBearerAuth()
@Controller("kyc")
export class KycController {
  constructor(private readonly kycService: KycService) {}

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
