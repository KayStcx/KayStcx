import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { User } from '../users/entities/user.entity';
import { Certificate } from '../certificate/entities/certificate.entity';
import { Verification } from '../certificate/entities/verification.entity';
import { Issuer } from '../issuers/entities/issuer.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Certificate, Verification, Issuer]),
    CacheModule.register({
      ttl: 120, // 2 minutes
      max: 100,
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
