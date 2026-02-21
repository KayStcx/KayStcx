# API Versioning Implementation Guide

## Overview

The Kaystcx API now supports comprehensive versioning to enable backward-compatible changes and smooth migrations between API versions.

## Implementation Summary

### Components Implemented

1. **Version Management**
   - `version.enum.ts` - Version definitions and configuration
   - `version.service.ts` - Version logic and migration guides
   - `version.controller.ts` - Version information endpoints

2. **Decorators**
   - `@ApiVersions()` - Mark controllers/routes with versions
   - `@Deprecated()` - Mark endpoints as deprecated with metadata

3. **Interceptors**
   - `DeprecationInterceptor` - Automatically adds deprecation headers

4. **DTOs**
   - `VersionInfoDto` - Version information structure
   - `ApiVersionsResponseDto` - API versions response
   - `MigrationGuideDto` - Migration guide structure

5. **Controllers**
   - `VersionController` - Provides version info and migration guides
   - `AuthV1Controller` - Example versioned controller

## API Endpoints

### Version Information

```
GET /api/versions
```

Returns current version, supported versions, and deprecation status.

### Migration Guide

```
GET /api/versions/migration-guide?from=1&to=2
```

Returns detailed migration guide between two versions.

## Usage for Developers

### Creating a Versioned Controller

```typescript
import { Controller, Get, Version } from '@nestjs/common';

@Controller({ path: 'resource', version: '1' })
export class ResourceV1Controller {
  @Get()
  findAll() {
    return { data: [] };
  }
}
```

### Marking Endpoints as Deprecated

```typescript
import { Deprecated } from '@/common/versioning';
import { ApiVersion } from '@/common/versioning';

@Controller({ path: 'resource', version: '1' })
export class ResourceV1Controller {
  @Get()
  @Deprecated(
    ApiVersion.V1,
    '2025-12-31', // Sunset date
    '/api/v2/resource', // Alternative endpoint
  )
  findAll() {
    return { data: [] };
  }
}
```

### Accessing Versioned Endpoints

```bash
# Explicit version
curl http://localhost:3000/api/v1/auth/login

# Default version (v1)
curl http://localhost:3000/api/auth/login
```

## Deprecation Headers

Deprecated endpoints automatically return these headers:

```
Deprecation: true
X-API-Deprecated-Since: 1
Sunset: 2025-12-31
Link: </api/v2/endpoint>; rel="alternate"
X-API-Deprecation-Info: This endpoint is deprecated. Please check the documentation for alternatives.
```

## Version Lifecycle

### 1. Planning Phase

- Define breaking changes
- Design new API structure
- Create migration guide

### 2. Development Phase

- Implement new version controllers
- Add version to `SUPPORTED_VERSIONS`
- Update migration guides in `version.service.ts`

### 3. Release Phase

- Announce new version
- Publish migration documentation
- Support both versions

### 4. Deprecation Phase

- Mark old version as deprecated
- Add to `DEPRECATED_VERSIONS`
- Set sunset date (6-12 months)

### 5. Sunset Phase

- Remove deprecated version
- Update documentation
- Archive old code

## Configuration

Edit `backend/src/common/versioning/version.enum.ts`:

```typescript
export enum ApiVersion {
  V1 = '1',
  V2 = '2',
}

export const CURRENT_VERSION = ApiVersion.V1;
export const SUPPORTED_VERSIONS = [ApiVersion.V1];
export const DEPRECATED_VERSIONS: ApiVersion[] = [];
```

## Testing

### Unit Tests

```bash
npm test -- version.service.spec.ts
npm test -- version.controller.spec.ts
npm test -- deprecation.interceptor.spec.ts
```

### E2E Tests

```bash
npm run test:e2e -- versioning.e2e-spec.ts
```

### Manual Testing

```bash
# Get version info
curl http://localhost:3000/api/versions

# Get migration guide
curl http://localhost:3000/api/versions/migration-guide?from=1&to=2

# Test versioned endpoint
curl http://localhost:3000/api/v1/auth/login
```

## Best Practices

1. **Semantic Versioning**
   - Major version for breaking changes
   - Keep versions simple (1, 2, 3)

2. **Backward Compatibility**
   - Maintain within same version
   - Add new fields as optional
   - Don't remove fields in same version

3. **Deprecation Period**
   - Minimum 6 months notice
   - Clear migration path
   - Active communication

4. **Documentation**
   - Update migration guides
   - Provide code examples
   - Document breaking changes

5. **Testing**
   - Test all supported versions
   - Verify deprecation headers
   - Check version compatibility

## Migration Example: V1 to V2

### Breaking Changes

- Authentication requires API key
- Date format changed to ISO 8601
- Response structure updated

### Migration Steps

1. **Update Authentication**

```typescript
// V1
headers: {
  'Authorization': 'Bearer <token>'
}

// V2
headers: {
  'Authorization': 'Bearer <token>',
  'X-API-Key': '<api-key>'
}
```

2. **Update Date Handling**

```typescript
// V1
const timestamp = 1640995200; // Unix timestamp

// V2
const timestamp = '2022-01-01T00:00:00Z'; // ISO 8601
```

3. **Update Response Parsing**

```typescript
// V1
{ data: [...] }

// V2
{
  data: [...],
  metadata: {
    version: '2',
    timestamp: '2022-01-01T00:00:00Z'
  }
}
```

## Troubleshooting

### Issue: Version not recognized

**Solution**: Check `SUPPORTED_VERSIONS` in `version.enum.ts`

### Issue: Deprecation headers not showing

**Solution**: Verify `@Deprecated()` decorator and interceptor registration

### Issue: Migration guide returns empty

**Solution**: Add guide to `version.service.ts` migration guides map

## Future Enhancements

- [ ] Automatic version detection from headers
- [ ] Version-specific rate limiting
- [ ] Analytics for version usage
- [ ] Automated migration testing
- [ ] Version-specific documentation generation

## Resources

- [NestJS Versioning Documentation](https://docs.nestjs.com/techniques/versioning)
- [API Versioning Best Practices](https://restfulapi.net/versioning/)
- [Semantic Versioning](https://semver.org/)

## Support

For questions or issues:

1. Check `/api/versions` endpoint
2. Review migration guides
3. Contact backend team
