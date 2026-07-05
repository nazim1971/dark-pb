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
import { CreateSongDto } from "./dto/create-song.dto";
import { SongQueryDto } from "./dto/song-query.dto";
import { UpdateSongDto } from "./dto/update-song.dto";
import { createSongSchema, songQuerySchema, updateSongSchema } from "./schemas/songs.zod";
import { SongsService } from "./songs.service";

@ApiTags("Songs")
@ApiBearerAuth()
@Controller("songs")
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post()
  @ApiOperation({ summary: "Create song" })
  @ApiBody({ type: CreateSongDto })
  @ApiOkResponse({ description: "Song created" })
  @UsePipes(new ZodValidationPipe(createSongSchema))
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSongDto) {
    return this.songsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "List songs with pagination, search and filters" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "released", required: false, type: Boolean })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "language", required: false, type: String })
  @ApiQuery({ name: "artistName", required: false, type: String })
  @ApiQuery({ name: "writerId", required: false, type: String })
  @ApiQuery({ name: "ownerId", required: false, type: String })
  @ApiOkResponse({ description: "Song list fetched" })
  @UsePipes(new ZodValidationPipe(songQuerySchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: SongQueryDto) {
    return this.songsService.list(user, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get song by id" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Song fetched" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.songsService.getById(user, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update song" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateSongDto })
  @ApiOkResponse({ description: "Song updated" })
  @UsePipes(new ZodValidationPipe(updateSongSchema))
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: Omit<UpdateSongDto, "id">,
  ) {
    return this.songsService.update(user, { ...dto, id });
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete song" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Song deleted" })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.songsService.remove(user, id);
  }
}
