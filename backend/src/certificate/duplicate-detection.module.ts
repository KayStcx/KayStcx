import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../entities/certificate.entity';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import { DuplicateDetectionController } from '../controllers/duplicate-detection.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate])],
  providers: [DuplicateDetectionService],
  controllers: [DuplicateDetectionController],
  exports: [DuplicateDetectionService],
})
export class DuplicateDetectionModule {}
