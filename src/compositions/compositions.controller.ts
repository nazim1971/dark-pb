import {
  Body,
  Controller,
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
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { CompositionActionDto } from "./dto/composition-action.dto";
import { CompositionQueryDto } from "./dto/composition-query.dto";
import { CreateCompositionDto } from "./dto/create-composition.dto";
import { UpsertCompositionRelationsDto } from "./dto/upsert-composition-relations.dto";
import { UpdateCompositionDto } from "./dto/update-composition.dto";
import {
  compositionActionSchema,
  compositionQuerySchema,
  createCompositionSchema,
  upsertCompositionRelationsSchema,
  updateCompositionSchema,
} from "./schemas/compositions.zod";
import { CompositionsService } from "./compositions.service";

@ApiTags("Compositions")
@ApiBearerAuth()
@Controller("compositions")
export class CompositionsController {
  constructor(private readonly compositionsService: CompositionsService) {}

  @Post()
  @ApiOperation({ summary: "Create composition draft/submission" })
  @ApiBody({ type: CreateCompositionDto })
  @ApiOkResponse({ description: "Composition created" })
  @UsePipes(new ZodValidationPipe(createCompositionSchema))
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCompositionDto) {
    return this.compositionsService.createComposition(user, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update composition" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateCompositionDto })
  @ApiOkResponse({ description: "Composition updated" })
  @UsePipes(new ZodValidationPipe(updateCompositionSchema))
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: Omit<UpdateCompositionDto, "id">,
  ) {
    return this.compositionsService.updateComposition(user, { ...dto, id });
  }

  @Post(":id/submit")
  @ApiOperation({ summary: "Submit draft composition for review" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: CompositionActionDto, required: false })
  @ApiOkResponse({ description: "Composition submitted" })
  @UsePipes(new ZodValidationPipe(compositionActionSchema))
  async submitForReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() action: CompositionActionDto,
  ) {
    return this.compositionsService.submitForReview(user, id, action);
  }

  @Post(":id/draft")
  @ApiOperation({ summary: "Move composition back to draft" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Composition reverted to draft" })
  async revertToDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.compositionsService.revertToDraft(user, id);
  }

  @Post(":id/approve")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Approve composition (admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: CompositionActionDto, required: false })
  @ApiOkResponse({ description: "Composition approved" })
  @UsePipes(new ZodValidationPipe(compositionActionSchema))
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() action: CompositionActionDto,
  ) {
    return this.compositionsService.approveComposition(user, id, action);
  }

  @Post(":id/reject")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Reject composition (admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: CompositionActionDto, required: false })
  @ApiOkResponse({ description: "Composition rejected" })
  @UsePipes(new ZodValidationPipe(compositionActionSchema))
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() action: CompositionActionDto,
  ) {
    return this.compositionsService.rejectComposition(user, id, action);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single composition" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Composition fetched" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.compositionsService.getById(user, id);
  }

  @Patch(":id/relations")
  @ApiOperation({ summary: "Upsert nested writers, recordings, and publishers" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpsertCompositionRelationsDto })
  @ApiOkResponse({ description: "Nested composition relations updated" })
  @UsePipes(new ZodValidationPipe(upsertCompositionRelationsSchema))
  async upsertRelations(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpsertCompositionRelationsDto,
  ) {
    return this.compositionsService.upsertRelations(user, id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List compositions with pagination and filters" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "songTitle", required: false, type: String })
  @ApiQuery({ name: "language", required: false, type: String })
  @ApiQuery({ name: "genre", required: false, type: String })
  @ApiQuery({ name: "iswc", required: false, type: String })
  @ApiQuery({ name: "isrc", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiOkResponse({ description: "Composition list fetched" })
  @UsePipes(new ZodValidationPipe(compositionQuerySchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: CompositionQueryDto) {
    return this.compositionsService.list(user, query);
  }
}
