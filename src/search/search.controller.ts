import { Controller, Get, Query, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { SearchQueryDto } from "./dto/search-query.dto";
import { searchQuerySchema } from "./schemas/search.zod";
import { SearchService } from "./search.service";

@ApiTags("Search")
@ApiBearerAuth()
@Throttle({ search: { ttl: 60_000, limit: 30 } })
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: "Global search across role-scoped Prompt 5 entities" })
  @ApiOkResponse({ description: "Search results returned" })
  @UsePipes(new ZodValidationPipe(searchQuerySchema))
  async globalSearch(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchQueryDto) {
    return this.searchService.globalSearch(user, query);
  }
}
