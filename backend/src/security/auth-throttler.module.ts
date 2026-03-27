// backend/src/security/auth-throttler.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { authThrottlerConfig } from './throttler-config';

@Module({
  imports: [
    // Initialize with the multi-limit configuration
    ThrottlerModule.forRoot(authThrottlerConfig),
  ],
  exports: [ThrottlerModule], // Export so AuthController can use the Guards
})
export class AuthSecurityModule {}
