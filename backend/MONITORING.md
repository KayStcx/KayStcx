# Health Checks and System Monitoring

This document describes the health checks and system monitoring implementation for the Kaystcx backend.

## Overview

The system includes comprehensive monitoring capabilities:
- **Health Check Endpoints**: Liveness and readiness probes for container orchestration
- **Prometheus Metrics**: Application metrics in Prometheus format
- **Sentry Integration**: Error tracking and alerting
- **Structured Logging**: Correlation IDs for request tracing
- **Database Monitoring**: Connection health verification
- **Stellar Network Monitoring**: Blockchain network status

## Health Check Endpoints

### Endpoints

All health endpoints are available under `/api/health/`

#### 1. **GET /api/health** - General Health
Returns the basic application health status.

```bash
curl http://localhost:3000/api/health
```

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

#### 2. **GET /api/health/live** - Liveness Probe
Kubernetes/container liveness probe - checks if the application is running.

```bash
curl http://localhost:3000/api/health/live
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-22T10:30:00.000Z",
  "message": "Application is alive"
}
```

#### 3. **GET /api/health/ready** - Readiness Probe
Kubernetes/container readiness probe - checks all critical dependencies.

```bash
curl http://localhost:3000/api/health/ready
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "message": "Database connection is healthy"
    },
    "stellar": {
      "status": "up",
      "message": "Stellar network is reachable",
      "network": "testnet",
      "horizon": "https://horizon-testnet.stellar.org"
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "statusCode": 503,
  "message": "Application is not ready",
  "error": {...}
}
```

#### 4. **GET /api/health/database** - Database Health
Checks database connectivity.

```bash
curl http://localhost:3000/api/health/database
```

#### 5. **GET /api/health/stellar** - Stellar Network Health
Checks Stellar network connectivity.

```bash
curl http://localhost:3000/api/health/stellar
```

## Prometheus Metrics

### Endpoint

**GET /api/metrics** - Returns metrics in Prometheus format

```bash
curl http://localhost:3000/api/metrics
```

### Available Metrics

#### HTTP Metrics
- `http_request_duration_seconds` (Histogram)
  - Labels: `method`, `route`, `status`
  - Records HTTP request latency

- `http_requests_total` (Counter)
  - Labels: `method`, `route`, `status`
  - Total HTTP requests

- `http_errors_total` (Counter)
  - Labels: `method`, `route`, `status`
  - Total HTTP errors

#### Database Metrics
- `db_query_duration_seconds` (Histogram)
  - Labels: `query_type`
  - Database query latency

- `db_connection_status` (Counter)
  - Labels: `status`
  - Database connection status

#### Application Metrics
- `certificate_issued_total` (Counter)
  - Labels: `issuer_id`
  - Total issued certificates

- `certificate_verified_total` (Counter)
  - Labels: `issuer_id`
  - Total verified certificates

- `authentication_attempts_total` (Counter)
  - Labels: `status`
  - Total authentication attempts

### Recording Metrics in Code

Inject `MetricsService` and use the recording methods:

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '../common/monitoring/metrics.service';

@Injectable()
export class CertificatesService {
  constructor(private metricsService: MetricsService) {}

  async issueCertificate(issuerId: string) {
    // ... issuance logic ...
    this.metricsService.recordCertificateIssued(issuerId);
  }

  async verifyCertificate(issuerId: string) {
    // ... verification logic ...
    this.metricsService.recordCertificateVerified(issuerId);
  }
}
```

## Sentry Error Tracking

### Configuration

Set environment variables to enable Sentry:

```env
SENTRY_DSN=https://your-key@sentry.io/project-id
ENABLE_SENTRY=true
NODE_ENV=production
```

### Features

- Automatic exception capture for 5xx errors
- Request context tracking
- Breadcrumb tracking
- User identification
- Source maps support

### Usage in Code

```typescript
import { Injectable } from '@nestjs/common';
import { SentryService } from '../common/monitoring/sentry.service';

@Injectable()
export class MyService {
  constructor(private sentryService: SentryService) {}

  async riskyOperation() {
    try {
      // ... operation code ...
    } catch (error) {
      this.sentryService.captureException(error, {
        operation: 'riskyOperation',
        userId: 'user-123',
      });
      throw error;
    }
  }

  trackEvent() {
    this.sentryService.captureMessage('Important event', 'info');
  }

  addDebugInfo() {
    this.sentryService.addBreadcrumb(
      'User performed action X',
      'user-action',
      'info',
    );
  }
}
```

## Structured Logging with Correlation IDs

### Features

- Automatic correlation ID generation (UUID)
- Request ID tracking
- User identification
- JSON structured logging
- Trace context propagation

### Using Correlation IDs

#### In Middleware (Automatic)
The `CorrelationIdMiddleware` automatically:
1. Generates or retrieves correlation ID from headers
2. Attaches it to the request context
3. Adds it to response headers (`x-correlation-id`)

#### In Code

```typescript
import { Injectable } from '@nestjs/common';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class MyService {
  constructor(private loggingService: LoggingService) {}

  async processRequest(correlationId: string) {
    const context = {
      correlationId,
      userId: 'user-123',
    };

    this.loggingService.log('Processing request started', context);

    try {
      // ... operation logic ...
      this.loggingService.log('Processing completed', context);
    } catch (error) {
      this.loggingService.error(
        'Processing failed',
        error,
        context,
      );
    }
  }
}
```

### Log Output Format

```json
{
  "timestamp": "2024-01-22T10:30:00.000Z",
  "level": "LOG",
  "message": "Processing request started",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "requestId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "user-123"
}
```

### Propagating Correlation ID in Client Requests

To trace requests across services, pass correlation ID in headers:

```bash
curl http://localhost:3000/api/certificates \
  -H "x-correlation-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-request-id: 550e8400-e29b-41d4-a716-446655440001"
```

## Kubernetes Deployment

### Health Check Configuration

For Kubernetes deployments, configure probes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kaystcx-api
spec:
  template:
    spec:
      containers:
        - name: api
          image: kaystcx-api:latest
          ports:
            - containerPort: 3000
          
          # Liveness probe - restart container if not responding
          livenessProbe:
            httpGet:
              path: /api/health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          
          # Readiness probe - don't route traffic if not ready
          readinessProbe:
            httpGet:
              path: /api/health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 3
```

## Docker Compose Example

```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - STELLAR_NETWORK=testnet
      - ENABLE_SENTRY=false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      - postgres
```

## Monitoring Setup

### Prometheus Configuration

Add to `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'kaystcx'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

### Grafana Dashboard

Create a Grafana dashboard to visualize metrics:

1. Add Prometheus as data source
2. Create panels for:
   - Request rate (http_requests_total)
   - Request latency (http_request_duration_seconds)
   - Error rate (http_errors_total)
   - Certificate issuance rate (certificate_issued_total)

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SENTRY_DSN` | Sentry DSN for error tracking | - | No |
| `ENABLE_SENTRY` | Enable Sentry integration | `false` | No |
| `NODE_ENV` | Environment (development/production) | `development` | No |

## Best Practices

1. **Use Correlation IDs**: Always pass correlation IDs in distributed requests
2. **Monitor Metrics**: Set up alerts for high error rates and latency
3. **Health Checks**: Include health checks in deployment pipelines
4. **Error Tracking**: Review Sentry reports regularly
5. **Log Analysis**: Use structured logs for debugging and analysis
6. **Database Monitoring**: Monitor database query performance
7. **Stellar Network**: Monitor blockchain connectivity

## Troubleshooting

### Health Check Returns 503

Check individual health endpoints:
- `GET /api/health/database` - Database connection issue
- `GET /api/health/stellar` - Stellar network unreachable

### Missing Metrics

Ensure `MetricsService` is properly injected and recording methods are called.

### Correlation IDs Not Showing

Ensure the `CorrelationIdMiddleware` is configured in `CommonModule`.

### Sentry Not Capturing Errors

Verify:
1. `SENTRY_DSN` is set correctly
2. `ENABLE_SENTRY=true` in environment
3. Error status code is >= 500 (or manually captured)
