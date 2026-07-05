import { Controller, Get, Query, Res, StreamableFile, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { RoyaltyExportQueryDto } from "../royalties/dto/royalty-export-query.dto";
import { RoyaltyQueryDto } from "../royalties/dto/royalty-query.dto";
import { royaltyExportSchema, royaltyFilterSchema } from "../royalties/schemas/royalties.zod";
import { StatementExportQueryDto } from "../statements/dto/statement-export-query.dto";
import { StatementQueryDto } from "../statements/dto/statement-query.dto";
import {
  statementExportQuerySchema,
  statementQuerySchema,
} from "../statements/schemas/statements.zod";
import { ReportsService } from "./reports.service";

@ApiTags("Reports")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("royalties")
  @ApiOperation({ summary: "Get royalty reporting data" })
  @ApiOkResponse({ description: "Royalty report generated" })
  @UsePipes(new ZodValidationPipe(royaltyFilterSchema))
  async getRoyaltiesReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RoyaltyQueryDto,
  ) {
    return this.reportsService.getRoyaltiesReport(user, query);
  }

  @Get("royalties/export")
  @Throttle({ export: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: "Export royalty report" })
  @ApiOkResponse({ description: "Royalty report exported" })
  @UsePipes(new ZodValidationPipe(royaltyExportSchema))
  async exportRoyaltiesReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RoyaltyExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.reportsService.exportRoyaltiesReport(user, query, query.format);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }

  @Get("statements")
  @ApiOperation({ summary: "Get statement reporting data" })
  @ApiOkResponse({ description: "Statement report generated" })
  @UsePipes(new ZodValidationPipe(statementQuerySchema))
  async getStatementsReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StatementQueryDto,
  ) {
    return this.reportsService.getStatementsReport(user, query);
  }

  @Get("statements/export")
  @Throttle({ export: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: "Export statement report" })
  @ApiOkResponse({ description: "Statement report exported" })
  @UsePipes(new ZodValidationPipe(statementExportQuerySchema))
  async exportStatementsReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StatementExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.reportsService.exportStatementsReport(user, query, query.format);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }
}
