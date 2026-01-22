# Health Checks and System Monitoring - Implementation Guide

## Quick Start

### 1. Package Dependencies

The implementation uses these packages (ensure they are in package.json):

```json
{
  "@nestjs/terminus": "^10.0.0",
  "@nestjs/axios": "^1.0.0",
  "prom-client": "^15.0.0",
  "@sentry/node": "^7.0.0",
  "uuid": "^9.0.0"
}
```

### 2. Installed Files Structure

```
src/
├── common/
│   ├── common.module.ts (NEW - exports all monitoring services)
│   ├── filters/
│   │   └── http-exception.filter.ts (UPDATED - integrated with Sentry & logging)
│   ├── logging/ (NEW)
│   │   ├── logging.service.ts
│   │   ├── correlation-id.middleware.ts
│   │   └── (correlation IDs and structured logging)
│   └── monitoring/ (NEW)
│       ├── metrics.service.ts (Prometheus metrics collection)
│       ├── sentry.service.ts (Error tracking integration)
│       ├── metrics.middleware.ts (HTTP metrics collection)
│       └── monitoring.interceptor.ts (Global request monitoring)
├── modules/
│   └── health/ (NEW)
│       ├── health.module.ts
│       ├── health.controller.ts (endpoints: /health, /health/live, /health/ready, etc.)
│       ├── metrics.controller.ts (Prometheus endpoint: /metrics)
│       └── indicators/
│           ├── database.health.ts (Database connection check)
│           ├── stellar.health.ts (Stellar network check)
│           └── custom.health.examples.ts (Examples for extension)
├── app.module.ts (UPDATED - added CommonModule, HealthModule)
├── config/
│   └── environment.config.ts (UPDATED - added Sentry config)
└── main.ts (UPDATED - integrated Sentry, logging, monitoring)
```

### 3. Environment Variables

Add these to your `.env` file:

```env
# Sentry (optional)
SENTRY_DSN=
ENABLE_SENTRY=false

# Monitoring is enabled by default
# Health endpoints: /api/health/*
# Metrics endpoint: /api/metrics
# Logging with correlation IDs is automatic
```

## Features Overview

### A. Health Check Endpoints

All endpoints return 200 OK or 503 Service Unavailable:

```
GET /api/health              # General health
GET /api/health/live         # Kubernetes liveness probe
GET /api/health/ready        # Kubernetes readiness probe (checks all dependencies)
GET /api/health/database     # Database connectivity
GET /api/health/stellar      # Stellar network connectivity
```

**Example:**
```bash
curl http://localhost:3000/api/health/ready
```

### B. Prometheus Metrics Endpoint

```
GET /api/metrics
```

Tracks:
- HTTP request metrics (duration, count, errors)
- Database metrics
- Application-specific metrics (certificates issued/verified, auth attempts)

**Example Prometheus query:**
```promql
rate(http_requests_total[5m])
```

### C. Structured Logging with Correlation IDs

Every request automatically gets:
- Unique correlation ID
- Request ID
- User ID (if authenticated)

All logs are JSON formatted for easy parsing.

**Response headers:**
```
x-correlation-id: 550e8400-e29b-41d4-a716-446655440000
x-request-id: 550e8400-e29b-41d4-a716-446655440001
```

### D. Sentry Error Tracking

Automatically captures 5xx errors when configured.

**Enable with:**
```env
SENTRY_DSN=https://your-key@sentry.io/project-id
ENABLE_SENTRY=true
```

### E. Database Monitoring

Checks database connection on `/api/health/database`

### F. Stellar Network Monitoring

Checks Stellar network connectivity on `/api/health/stellar`

## Usage Examples

### Using Metrics in Services

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '../common/monitoring/metrics.service';

@Injectable()
export class CertificatesService {
  constructor(private metricsService: MetricsService) {}

  async issueCertificate(issuerId: string) {
    // Your logic...
    this.metricsService.recordCertificateIssued(issuerId);
  }
}
```

### Using Logging with Context

```typescript
import { Injectable } from '@nestjs/common';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class MyService {
  constructor(private loggingService: LoggingService) {}

  processRequest(correlationId: string) {
    const context = { correlationId, userId: 'user-123' };
    
    this.loggingService.log('Started', context);
    try {
      // Work...
      this.loggingService.log('Completed', context);
    } catch (error) {
      this.loggingService.error('Failed', error, context);
    }
  }
}
```

### Using Sentry

```typescript
import { Injectable } from '@nestjs/common';
import { SentryService } from '../common/monitoring/sentry.service';

@Injectable()
export class MyService {
  constructor(private sentryService: SentryService) {}

  criticalOperation() {
    try {
      // Risky code...
    } catch (error) {
      this.sentryService.captureException(error);
      this.sentryService.addBreadcrumb('Critical operation failed', 'error');
    }
  }
}
```

## Extending Health Checks

Add custom health indicators:

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class CustomHealthIndicator extends HealthIndicator {
  async isHealthy(): Promise<HealthIndicatorResult> {
    // Check your custom dependency
    const isHealthy = await checkMyDependency();
    
    if (isHealthy) {
      return this.getStatus('custom', true);
    } else {
      throw new HealthCheckError('Custom failed', this.getStatus('custom', false));
    }
  }
}
```

Register in `health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CustomHealthIndicator } from './indicators/custom.health';

@Module({
  providers: [CustomHealthIndicator],
})
export class HealthModule {}
```

## Kubernetes Integration

Use health endpoints in Kubernetes deployment:

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Monitoring Stack

### Recommended Setup

1. **Prometheus** - Scrape `/api/metrics`
   ```yaml
   scrape_configs:
     - job_name: 'kaystcx'
       static_configs:
         - targets: ['localhost:3000']
       metrics_path: '/api/metrics'
   ```

2. **Grafana** - Visualize Prometheus data

3. **Sentry** - Error tracking dashboard

4. **ELK Stack** - Log aggregation from structured logs

## Performance Considerations

- Health checks are fast and non-blocking
- Metrics collection has minimal overhead
- Correlation ID generation uses UUID v4
- Database health check performs single SELECT query
- Stellar health check queries latest ledger

## Security

- Health endpoints don't require authentication
- Metrics endpoint is public (contains aggregated data)
- Sentry DSN should be kept secret in environment variables
- Correlation IDs are for tracing, not sensitive data

## Troubleshooting

### Health endpoints return 503

Check individual indicators:
```bash
curl http://localhost:3000/api/health/database
curl http://localhost:3000/api/health/stellar
```

### No metrics appearing

1. Verify MetricsService is injected in services
2. Check that recording methods are called
3. Ensure `prom-client` is installed

### Correlation IDs not in logs

1. Verify `CorrelationIdMiddleware` is registered in `CommonModule`
2. Check that middleware runs before your service

### Sentry not capturing errors

1. Verify `SENTRY_DSN` is set
2. Ensure `ENABLE_SENTRY=true`
3. Check that error status >= 500
4. Or manually call `sentryService.captureException()`

## Next Steps

1. Add custom health indicators for your services
2. Set up Prometheus and Grafana
3. Configure Sentry for your organization
4. Create alerting rules in Prometheus
5. Document SLOs for your service
