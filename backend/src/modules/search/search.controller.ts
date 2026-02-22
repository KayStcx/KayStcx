import { Controller, Get, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SearchService } from './search.service';
import { ReindexService } from './reindex.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly reindexService: ReindexService,
  ) {}

  @Get('certificates')
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  reindex() {
    return this.reindexService.reindex();
  }
}
