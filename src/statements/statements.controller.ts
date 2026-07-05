import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { StatementsService } from "./statements.service";
import { GenerateStatementDto } from "./dto/generate-statement.dto";
import { StatementExportQueryDto } from "./dto/statement-export-query.dto";
import { StatementFileQueryDto } from "./dto/statement-file-query.dto";
import { StatementQueryDto } from "./dto/statement-query.dto";
import {
  generateStatementSchema,
  statementExportQuerySchema,
  statementFileQuerySchema,
  statementQuerySchema,
} from "./schemas/statements.zod";

@ApiTags("Statements")
@ApiBearerAuth()
@Controller("statements")
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Post("generate")
  @ApiOperation({ summary: "Generate a statement from royalties" })
  @ApiBody({ type: GenerateStatementDto })
  @ApiOkResponse({ description: "Statement generated" })
  @UsePipes(new ZodValidationPipe(generateStatementSchema))
  @Roles("ADMIN")
  async generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateStatementDto) {
    return this.statementsService.generate(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List statements with filters and pagination" })
  @ApiOkResponse({ description: "Statements fetched" })
  @UsePipes(new ZodValidationPipe(statementQuerySchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: StatementQueryDto) {
    return this.statementsService.list(user, query);
  }

  @Get("export")
  @ApiOperation({ summary: "Export statements to CSV, Excel, or PDF" })
  @ApiOkResponse({ description: "Statements exported" })
  @UsePipes(new ZodValidationPipe(statementExportQuerySchema))
  @Roles("ADMIN")
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StatementExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.statementsService.export(user, query, query.format);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a statement by id" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Statement fetched" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.statementsService.getById(user, id);
  }

  @Get(":id/export")
  @ApiOperation({ summary: "Export a single statement" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Statement exported" })
  @UsePipes(new ZodValidationPipe(statementFileQuerySchema))
  async exportById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: StatementFileQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.statementsService.exportById(user, id, query.format);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }
}
