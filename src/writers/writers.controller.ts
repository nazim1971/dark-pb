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
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { CreateWriterDto } from "./dto/create-writer.dto";
import { UpdateWriterDto } from "./dto/update-writer.dto";
import { WriterQueryDto } from "./dto/writer-query.dto";
import { createWriterSchema, updateWriterSchema, writerQuerySchema } from "./schemas/writers.zod";
import { WritersService } from "./writers.service";

@ApiTags("Writers")
@ApiBearerAuth()
@Controller("writers")
export class WritersController {
  constructor(private readonly writersService: WritersService) {}

  @Post()
  @ApiOperation({ summary: "Create writer" })
  @ApiBody({ type: CreateWriterDto })
  @ApiOkResponse({ description: "Writer created" })
  @UsePipes(new ZodValidationPipe(createWriterSchema))
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWriterDto) {
    return this.writersService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "List writers with pagination and search" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "pro", required: false, type: String })
  @ApiQuery({ name: "ipiNumber", required: false, type: String })
  @ApiQuery({ name: "userId", required: false, type: String })
  @ApiOkResponse({ description: "Writer list fetched" })
  @UsePipes(new ZodValidationPipe(writerQuerySchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: WriterQueryDto) {
    return this.writersService.list(user, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get writer by id" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Writer fetched" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.writersService.getById(user, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update writer" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateWriterDto })
  @ApiOkResponse({ description: "Writer updated" })
  @UsePipes(new ZodValidationPipe(updateWriterSchema))
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: Omit<UpdateWriterDto, "id">,
  ) {
    return this.writersService.update(user, { ...dto, id });
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete writer" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Writer deleted" })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.writersService.remove(user, id);
  }
}
