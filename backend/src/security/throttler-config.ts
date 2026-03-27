// backend/src/security/throttler-config.ts
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const authThrottlerConfig: ThrottlerModuleOptions = [
  {
    name: 'login',
    ttl: 60000, // 1 minute
    limit: 5,   // Allow 5 attempts per minute
  },
  {
    name: 'registration',
    ttl: 3600000, // 1 hour
    limit: 3,     // Allow only 3 sign-ups per hour per IP
  }
];
