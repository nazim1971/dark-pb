import { Controller, Get, Query, Res, StreamableFile, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
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
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("royalties")
  @ApiOperation({ summary: "Get royalty reporting data" })
  @ApiOkResponse({ description: "Royalty report generated" })
  @UsePipes(new ZodValidationPipe(royaltyFilterSchema))
  async getRoyaltiesReport(@Query() query: RoyaltyQueryDto) {
    return this.reportsService.getRoyaltiesReport(query);
  }

  @Get("royalties/export")
  @ApiOperation({ summary: "Export royalty report" })
  @ApiOkResponse({ description: "Royalty report exported" })
  @UsePipes(new ZodValidationPipe(royaltyExportSchema))
  async exportRoyaltiesReport(
    @Query() query: RoyaltyExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.reportsService.exportRoyaltiesReport(query, query.format);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }

  @Get("statements")
  @ApiOperation({ summary: "Get statement reporting data" })
  @ApiOkResponse({ description: "Statement report generated" })
  @UsePipes(new ZodValidationPipe(statementQuerySchema))
  async getStatementsReport(@Query() query: StatementQueryDto) {
    return this.reportsService.getStatementsReport(query);
  }

  @Get("statements/export")
  @ApiOperation({ summary: "Export statement report" })
  @ApiOkResponse({ description: "Statement report exported" })
  @UsePipes(new ZodValidationPipe(statementExportQuerySchema))
  async exportStatementsReport(
    @Query() query: StatementExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.reportsService.exportStatementsReport(query, query.format);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }
}
