import { Controller, Get, Query, UsePipes } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { SearchQueryDto } from "./dto/search-query.dto";
import { searchQuerySchema } from "./schemas/search.zod";
import { SearchService } from "./search.service";

@ApiTags("Search")
@ApiBearerAuth()
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: "Global search across songs, writers, publishers, and recordings" })
  @ApiOkResponse({ description: "Search results returned" })
  @UsePipes(new ZodValidationPipe(searchQuerySchema))
  async globalSearch(@Query() query: SearchQueryDto) {
    return this.searchService.globalSearch(query);
  }
}
