import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { RoyaltiesService } from "./royalties.service";
import { CreateRoyaltyDto } from "./dto/create-royalty.dto";
import { RoyaltyExportQueryDto } from "./dto/royalty-export-query.dto";
import { RoyaltyQueryDto } from "./dto/royalty-query.dto";
import {
  createRoyaltySchema,
  royaltyExportSchema,
  royaltyFilterSchema,
  updateRoyaltySchema,
} from "./schemas/royalties.zod";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { UpdateRoyaltyDto } from "./dto/update-royalty.dto";

@ApiTags("Royalties")
@ApiBearerAuth()
@Controller("royalties")
export class RoyaltiesController {
  constructor(private readonly royaltiesService: RoyaltiesService) {}

  @Post()
  @ApiOperation({ summary: "Create a royalty record" })
  @ApiBody({ type: CreateRoyaltyDto })
  @ApiOkResponse({ description: "Royalty created" })
  @UsePipes(new ZodValidationPipe(createRoyaltySchema))
  @Roles("ADMIN")
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoyaltyDto) {
    return this.royaltiesService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "List royalties with filters and pagination" })
  @ApiQuery({ name: "song", required: false, type: String })
  @ApiQuery({ name: "month", required: false, type: Number })
  @ApiQuery({ name: "year", required: false, type: Number })
  @ApiQuery({ name: "country", required: false, type: String })
  @ApiQuery({ name: "dsp", required: false, type: String })
  @ApiQuery({ name: "type", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiOkResponse({ description: "Royalties fetched" })
  @UsePipes(new ZodValidationPipe(royaltyFilterSchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: RoyaltyQueryDto) {
    return this.royaltiesService.list(user, query);
  }

  @Get("analytics")
  @ApiOperation({ summary: "Get royalty analytics" })
  @ApiOkResponse({ description: "Royalty analytics generated" })
  @UsePipes(new ZodValidationPipe(royaltyFilterSchema))
  async analytics(@CurrentUser() user: AuthenticatedUser, @Query() query: RoyaltyQueryDto) {
    return this.royaltiesService.analytics(user, query);
  }

  @Get("export")
  @ApiOperation({ summary: "Export royalties to CSV, Excel, or PDF" })
  @ApiOkResponse({ description: "Royalties exported" })
  @UsePipes(new ZodValidationPipe(royaltyExportSchema))
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RoyaltyExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.royaltiesService.export(user, query, query.format);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get royalty by id" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Royalty fetched" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.royaltiesService.getById(user, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update royalty record" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateRoyaltyDto })
  @ApiOkResponse({ description: "Royalty updated" })
  @Roles("ADMIN")
  @UsePipes(new ZodValidationPipe(updateRoyaltySchema))
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoyaltyDto,
  ) {
    return this.royaltiesService.update(user, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete royalty record" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Royalty deleted" })
  @Roles("ADMIN")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.royaltiesService.remove(user, id);
  }
}
