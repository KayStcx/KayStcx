import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetadataSchema } from './entities/metadata-schema.entity';
import { MetadataSchemaService } from './services/metadata-schema.service';
import { MetadataSchemaController } from './controllers/metadata-schema.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MetadataSchema])],
  controllers: [MetadataSchemaController],
  providers: [MetadataSchemaService],
  exports: [MetadataSchemaService],
})
export class MetadataSchemaModule {}
