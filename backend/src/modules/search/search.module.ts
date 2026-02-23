import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Certificate } from '../certificates/entities/certificate.entity';
import { ElasticsearchProvider } from './providers/elasticsearch.provider';
import { SearchService } from './search.service';
import { ReindexService } from './reindex.service';
import { SearchController } from './search.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate]),
    ScheduleModule.forRoot(),
  ],
  providers: [ElasticsearchProvider, SearchService, ReindexService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
