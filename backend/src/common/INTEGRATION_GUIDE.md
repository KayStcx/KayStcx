## Common Module Implementation Guide

This document provides integration steps and examples for using the comprehensive common module.

### Quick Start

The CommonModule is automatically initialized in AppModule and provides all global infrastructure:
- Authentication/Authorization (JWT + Roles)
- Request/Response standardization
- Exception handling
- Logging and monitoring
- Utilities and helpers

No additional module imports are needed in your controllers.

### Integration Examples

#### 1. Using Role-Based Access Control

```typescript
import { Controller, Get, Post, Delete } from '@nestjs/common';
import { Roles, CurrentUser, Public } from '@common/decorators';
import { UserRole } from '@common/constants';

@Controller('certificates')
export class CertificatesController {
  // Public endpoint - no authentication
  @Get('verify/:hash')
  @Public()
  verifyCertificate(@Param('hash') hash: string) {
    // Anyone can access
  }

  // Authenticated users only
  @Get('my-certificates')
  getMyCertificates(@CurrentUser() user: any) {
    // Only logged-in users
    return { userId: user.id };
  }

  // Admin and Issuer only
  @Post('create')
  @Roles(UserRole.ADMIN, UserRole.ISSUER)
  createCertificate(
    @CurrentUser() user: any,
    @Body() dto: CreateCertificateDto
  ) {
    // Only admin and issuer can create
  }

  // Admin only
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  revokeCertificate(@Param('id') id: string) {
    // Only admin can revoke
  }
}
```

#### 2. Exception Handling

```typescript
import {
  StellarException,
  CertificateException,
  ValidationException,
  NotFoundException,
} from '@common/exceptions';
import { ErrorCode } from '@common/constants';

@Injectable()
export class CertificatesService {
  async createCertificate(dto: CreateCertificateDto) {
    // Validation error
    if (!isValidData(dto)) {
      throw new ValidationException('Invalid certificate data', {
        hash: 'Invalid hash format',
      });
    }

    // Not found error
    const issuer = await this.getIssuer(dto.issuerId);
    if (!issuer) {
      throw new NotFoundException(
        `Issuer with ID ${dto.issuerId} not found`
      );
    }

    // Stellar blockchain error
    try {
      await this.stellarService.createTransaction(dto);
    } catch (error) {
      throw new StellarException(
        ErrorCode.INVALID_TRANSACTION,
        'Failed to create blockchain transaction',
        { originalError: error.message }
      );
    }

    // Certificate error
    const existing = await this.findCertificate(dto.hash);
    if (existing) {
      throw new CertificateException(
        ErrorCode.CERTIFICATE_ALREADY_EXISTS,
        `Certificate with hash ${dto.hash} already exists`
      );
    }
  }
}
```

#### 3. Input Validation with DTOs

```typescript
import { IsEmail, IsString, MinLength, Matches, IsUUID } from 'class-validator';
import { STELLAR_ADDRESS_REGEX } from '@common/constants';

export class CreateCertificateDto {
  @IsUUID()
  issuerId: string;

  @IsString()
  @MinLength(5)
  title: string;

  @Matches(STELLAR_ADDRESS_REGEX, {
    message: 'Invalid Stellar address format'
  })
  recipientAddress: string;

  @IsString()
  hash: string;

  @IsString()
  metadata?: string;
}

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
```

#### 4. Using Validation Utilities

```typescript
import { Injectable } from '@nestjs/common';
import { ValidationUtils } from '@common/utils';
import { ValidationException } from '@common/exceptions';

@Injectable()
export class StellarService {
  validateAddress(address: string) {
    if (!ValidationUtils.isStellarAddress(address)) {
      throw new ValidationException('Invalid Stellar address', {
        address: 'Must be a valid Stellar public key (starting with G)'
      });
    }
    return true;
  }

  validateTransactionHash(hash: string) {
    if (!ValidationUtils.isStellarTransactionHash(hash)) {
      throw new ValidationException('Invalid transaction hash', {
        hash: 'Must be 64 character hex string'
      });
    }
    return true;
  }
}
```

#### 5. Using Crypto Utilities

```typescript
import { Injectable } from '@nestjs/common';
import { CryptoUtils } from '@common/utils';

@Injectable()
export class AuthService {
  // Register user with hashed password
  async registerUser(email: string, password: string) {
    // Hash password
    const hashedPassword = await CryptoUtils.hashPassword(password);
    
    // Generate verification token
    const verificationToken = CryptoUtils.generateToken(32);
    
    return this.usersService.create({
      email,
      password: hashedPassword,
      verificationToken,
    });
  }

  // Verify password during login
  async validatePassword(plainPassword: string, hashedPassword: string) {
    return CryptoUtils.comparePassword(plainPassword, hashedPassword);
  }

  // Create API token
  generateApiToken() {
    return CryptoUtils.generateToken(64);
  }

  // Generate OTP for 2FA
  generateOTP() {
    return CryptoUtils.generateNumericCode(6);
  }

  // Create webhook signature
  createWebhookSignature(data: string, secret: string) {
    return CryptoUtils.createHMAC(data, secret);
  }
}
```

#### 6. Using Transform Utilities

```typescript
import { Injectable } from '@nestjs/common';
import { TransformUtils } from '@common/utils';

@Injectable()
export class CertificateService {
  // Format response
  formatCertificateResponse(cert: any) {
    return {
      ...TransformUtils.pick(cert, ['id', 'hash', 'status', 'createdAt']),
      createdAtUnix: TransformUtils.toUnixTimestamp(cert.createdAt),
    };
  }

  // Prepare for storage
  prepareCertificateForStorage(dto: any) {
    const cleaned = TransformUtils.removeUndefined(dto);
    const snakeCase = TransformUtils.toSnakeCase(cleaned);
    return snakeCase;
  }

  // Parse database response
  parseDatabaseCertificate(dbCert: any) {
    return TransformUtils.toCamelCase(dbCert);
  }

  // Safe object merge
  mergeCertificateUpdates(existing: any, updates: any) {
    return TransformUtils.merge(existing, updates);
  }
}
```

#### 7. Error Response Examples

**Validation Error (400)**
```json
{
  "errorCode": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "email": "Must be a valid email",
    "password": "Must be at least 8 characters"
  },
  "timestamp": "2024-01-23T10:30:00.000Z",
  "path": "/api/auth/register",
  "correlationId": "req-abc123"
}
```

**Authentication Error (401)**
```json
{
  "errorCode": "UNAUTHORIZED",
  "message": "Missing authentication token",
  "timestamp": "2024-01-23T10:30:00.000Z",
  "path": "/api/certificates",
  "correlationId": "req-abc123"
}
```

**Authorization Error (403)**
```json
{
  "errorCode": "INSUFFICIENT_PERMISSIONS",
  "message": "User role 'user' is not authorized to access this resource",
  "timestamp": "2024-01-23T10:30:00.000Z",
  "path": "/api/certificates/revoke/123",
  "correlationId": "req-abc123"
}
```

**Certificate Error (404)**
```json
{
  "errorCode": "CERTIFICATE_NOT_FOUND",
  "message": "Certificate not found",
  "details": {
    "certificateId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-23T10:30:00.000Z",
  "path": "/api/certificates/550e8400-e29b-41d4-a716-446655440000",
  "correlationId": "req-abc123"
}
```

### Testing Examples

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards';
import { CertificatesController } from './certificates.controller';

describe('CertificatesController', () => {
  let controller: CertificatesController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [CertificatesController],
      // Provide your services
    }).compile();

    controller = module.get<CertificatesController>(CertificatesController);
  });

  it('should allow public routes without auth', async () => {
    const result = await controller.verifyCertificate('hash123');
    expect(result).toBeDefined();
  });

  it('should reject unauthorized requests', async () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
      getHandler: () => ({}),
      getClass: () => CertificatesController,
    };

    const guard = new JwtAuthGuard(jwtService, reflector);
    expect(() => guard.canActivate(mockExecutionContext)).toThrow();
  });
});
```

### Response Interceptor Usage

All successful responses are automatically wrapped:

**Request:** `GET /api/users/123`

**Response:**
```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "id": "123",
    "email": "user@example.com",
    "role": "user"
  },
  "timestamp": "2024-01-23T10:30:00.000Z",
  "path": "/api/users/123",
  "correlationId": "req-abc123"
}
```

### Middleware & Correlation IDs

Every request gets a unique correlation ID automatically:

```typescript
// Your services can access it
constructor(private loggingService: LoggingService) {}

myMethod(context: any) {
  // Access via request context
  const correlationId = context.correlationId;
  
  this.loggingService.log('Action performed', {
    correlationId,
    action: 'certificate_created'
  });
}
```

### Configuration

Key environment variables:

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here

# Sentry Error Tracking
SENTRY_DSN=https://your-key@sentry.io/...
SENTRY_ENVIRONMENT=production

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Node
NODE_ENV=development
```

### Best Practices

1. **Always throw custom exceptions** - Don't use generic errors
2. **Use DTOs for validation** - Leverage class-validator decorators
3. **Mark public routes** - Apply @Public() decorator explicitly
4. **Specify role requirements** - Use @Roles() for protected routes
5. **Use current user decorator** - Get user info safely via @CurrentUser()
6. **Sanitize sensitive data** - Log interceptor automatically masks passwords
7. **Implement pagination** - Use PaginationDto from common
8. **Handle dates properly** - Use TransformUtils for date conversions

### Common Patterns

**Check user ownership:**
```typescript
@Get(':id')
async getCertificate(
  @Param('id') id: string,
  @CurrentUser() user: any
) {
  const cert = await this.certificatesService.findOne(id);
  if (cert.userId !== user.id && user.role !== UserRole.ADMIN) {
    throw new AuthException(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      'Cannot access this certificate'
    );
  }
  return cert;
}
```

**Paginated responses:**
```typescript
async listCertificates(@Query() query: ListCertificatesDto) {
  const [data, total] = await this.certificatesService.findMany(
    query.page,
    query.limit
  );
  
  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }
  };
}
```

For more examples and detailed API documentation, see the main [README.md](./README.md).
