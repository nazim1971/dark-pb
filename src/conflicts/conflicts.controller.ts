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
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { ConflictQueryDto } from "./dto/conflict-query.dto";
import { CreateConflictDto } from "./dto/create-conflict.dto";
import { DetectConflictDto } from "./dto/detect-conflict.dto";
import { ResolveConflictDto } from "./dto/resolve-conflict.dto";
import { ReviewConflictDto } from "./dto/review-conflict.dto";
import { UpdateConflictDto } from "./dto/update-conflict.dto";
import {
  conflictQuerySchema,
  createConflictSchema,
  detectConflictSchema,
  resolveConflictSchema,
  reviewConflictSchema,
  updateConflictSchema,
} from "./schemas/conflicts.zod";
import { ConflictsService } from "./conflicts.service";

@ApiTags("Conflicts")
@ApiBearerAuth()
@Controller("conflicts")
export class ConflictsController {
  constructor(private readonly conflictsService: ConflictsService) {}

  @Post()
  @ApiOperation({ summary: "Create conflict" })
  @ApiBody({ type: CreateConflictDto })
  @ApiOkResponse({ description: "Conflict created" })
  @UsePipes(new ZodValidationPipe(createConflictSchema))
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateConflictDto) {
    return this.conflictsService.create(user, dto);
  }

  @Post("detect")
  @ApiOperation({ summary: "Detect conflict from claim mismatch" })
  @ApiBody({ type: DetectConflictDto })
  @ApiOkResponse({ description: "Conflict detection completed" })
  @UsePipes(new ZodValidationPipe(detectConflictSchema))
  async detect(@CurrentUser() user: AuthenticatedUser, @Body() dto: DetectConflictDto) {
    return this.conflictsService.detect(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "List conflicts with pagination and filters" })
  @ApiOkResponse({ description: "Conflicts fetched" })
  @UsePipes(new ZodValidationPipe(conflictQuerySchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ConflictQueryDto) {
    return this.conflictsService.list(user, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get conflict by id with timeline" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Conflict fetched" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.conflictsService.getById(user, id);
  }

  @Get(":id/timeline")
  @ApiOperation({ summary: "Get conflict timeline" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Conflict timeline fetched" })
  async getTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    await this.conflictsService.getById(user, id);
    return this.conflictsService.getTimeline(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update conflict (reporter/admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateConflictDto })
  @ApiOkResponse({ description: "Conflict updated" })
  @UsePipes(new ZodValidationPipe(updateConflictSchema))
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateConflictDto,
  ) {
    return this.conflictsService.update(user, id, dto);
  }

  @Patch(":id/review")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Move conflict to under review (admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ReviewConflictDto, required: false })
  @ApiOkResponse({ description: "Conflict moved to under review" })
  @UsePipes(new ZodValidationPipe(reviewConflictSchema))
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ReviewConflictDto,
  ) {
    return this.conflictsService.review(user, id, dto);
  }

  @Patch(":id/resolve")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Resolve or reject conflict (admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ResolveConflictDto })
  @ApiOkResponse({ description: "Conflict resolution completed" })
  @UsePipes(new ZodValidationPipe(resolveConflictSchema))
  async resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ResolveConflictDto,
  ) {
    return this.conflictsService.resolve(user, id, dto);
  }
}
