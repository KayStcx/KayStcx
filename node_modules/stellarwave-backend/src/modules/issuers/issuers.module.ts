import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssuersService } from './issuers.service';
import { IssuersController } from './issuers.controller';
import { Issuer } from './entities/issuer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Issuer])],
  controllers: [IssuersController],
  providers: [IssuersService],
})
export class IssuersModule {}
