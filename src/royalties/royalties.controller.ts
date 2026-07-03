import { Body, Controller, Get, Post, Query, Res, StreamableFile, UsePipes } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
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
} from "./schemas/royalties.zod";

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
  async create(@Body() dto: CreateRoyaltyDto) {
    return this.royaltiesService.create(dto);
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
  async list(@Query() query: RoyaltyQueryDto) {
    return this.royaltiesService.list(query);
  }

  @Get("analytics")
  @ApiOperation({ summary: "Get royalty analytics" })
  @ApiOkResponse({ description: "Royalty analytics generated" })
  @UsePipes(new ZodValidationPipe(royaltyFilterSchema))
  async analytics(@Query() query: RoyaltyQueryDto) {
    return this.royaltiesService.analytics(query);
  }

  @Get("export")
  @ApiOperation({ summary: "Export royalties to CSV, Excel, or PDF" })
  @ApiOkResponse({ description: "Royalties exported" })
  @UsePipes(new ZodValidationPipe(royaltyExportSchema))
  async export(
    @Query() query: RoyaltyExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.royaltiesService.export(query, query.format);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }
}
