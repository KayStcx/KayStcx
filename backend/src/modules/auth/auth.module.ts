import { Module, forwardRef } from '@nestjs/common'; // Add forwardRef
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtManagementService } from './services/jwt.service';
import { UsersModule } from '../users/users.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register(),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret_key_for_dev',
      signOptions: {
        expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10),
      },
    }),
    forwardRef(() => UsersModule), // Use forwardRef here too
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtManagementService],
  exports: [
    AuthService,
    JwtModule, // Keep this - it's important!
    JwtManagementService,
  ],
})
export class AuthModule {}
