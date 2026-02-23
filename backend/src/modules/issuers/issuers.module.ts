import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issuer } from './issuer.entity';
import { IssuersService } from './issuers.service';
import { IssuersController } from './issuers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Issuer])],
  providers: [IssuersService],
  controllers: [IssuersController],
})
export class IssuersModule {}
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
