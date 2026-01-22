# Health & Monitoring Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Express/NestJS Application                │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   ┌─────────────┐         ┌──────────────────┐
   │  Middleware │         │  Interceptors    │
   ├─────────────┤         ├──────────────────┤
   │ • Cors      │         │ • Monitoring     │
   │ • Logging   │         │ • Error Handling │
   │ • Metrics   │         │ • Context        │
   │ • Correlation│         └──────────────────┘
   │   ID        │
   └────────────┬┘
                │
        ┌───────┴──────────────────────────────┐
        │                                      │
        ▼                                      ▼
   ┌──────────────┐                ┌────────────────────┐
   │  Controllers │                │  Services          │
   ├──────────────┤                ├────────────────────┤
   │• Health      │                │• Certificates      │
   │• Metrics     │                │• Users             │
   │• Other APIs  │                │• Auth              │
   └──────┬───────┘                └────┬───────────────┘
          │                             │
          └──────────────┬──────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌──────────────┐            ┌───────────────────┐
    │  Database    │            │  External Services│
    ├──────────────┤            ├───────────────────┤
    │• PostgreSQL  │            │• Stellar Network  │
    │• TypeORM     │            │• Sentry           │
    │• Health Check│            │• Prometheus       │
    └──────────────┘            └───────────────────┘
```

---

## Request Flow with Monitoring

```
Incoming Request
       │
       ▼
┌─────────────────────────┐
│ Correlation ID Middleware│  ◄── Generates/Extracts correlation ID
│ MetricsMiddleware       │  ◄── Starts timer
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Global Exception Filter │  ◄── Ready to catch errors
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Monitoring Interceptor  │  ◄── Wraps request handling
├─────────────────────────┤
│ • Record start time     │
│ • Track execution       │
│ • Capture errors        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Controller/Service      │  ◄── Executes business logic
│ • Logs with context     │  ◄── Uses correlation ID
│ • Records metrics       │  ◄── Calls MetricsService
└────────────┬────────────┘
             │
             ├─────► Database ─────► Health Check ─────► Metrics
             │
             └────────┬──────────────┘
                      │
                      ▼
             ┌─────────────────────┐
             │ Response Sent        │  ◄── Duration recorded
             │ Metrics Updated      │  ◄── Status recorded
             │ Correlation ID Added │  ◄── In headers
             └─────────────────────┘
```

---

## Component Interactions

### 1. Monitoring Interceptor & Metrics Service

```
Request
  ├─► MonitoringInterceptor
  │    ├─► Start timer
  │    ├─► Call handler
  │    ├─► Calculate duration
  │    └─► MetricsService.recordHttpRequestDuration()
  │
  └─► Response
       └─► Add metrics to Prometheus registry
```

### 2. Error Handling Flow

```
Error Occurs
  │
  ├─► HttpExceptionFilter
  │    ├─► LoggingService.error()
  │    │    └─► Logs with correlationId
  │    │
  │    └─► SentryService.captureException() [if status >= 500]
  │         └─► Send to Sentry dashboard
  │
  └─► Response (error details)
```

### 3. Health Check Architecture

```
Health Endpoint Request
  │
  ├─► HealthController
  │    ├─► /health/live
  │    │    └─► Returns OK immediately
  │    │
  │    ├─► /health/ready
  │    │    ├─► DatabaseHealthIndicator
  │    │    │    └─► Check DB connection
  │    │    │
  │    │    └─► StellarHealthIndicator
  │    │         └─► Check Stellar network
  │    │
  │    ├─► /health/database
  │    │    └─► DatabaseHealthIndicator
  │    │
  │    └─► /health/stellar
  │         └─► StellarHealthIndicator
  │
  └─► Response (200 OK or 503 Service Unavailable)
```

---

## Data Flow: Correlation ID

```
Client Request
└─► Header: x-correlation-id (or auto-generated)
    │
    ├─► CorrelationIdMiddleware
    │    ├─► Extract or generate UUID
    │    ├─► Attach to request context
    │    └─► Store in LoggingService
    │
    ├─► All Services/Controllers
    │    └─► Receive correlationId in context
    │
    ├─► Logs
    │    └─► JSON: { correlationId, level, message, ... }
    │
    └─► Response Headers
         └─► x-correlation-id: <uuid>
```

---

## Data Flow: Metrics

```
Request Execution
  │
  ├─► MetricsMiddleware
  │    └─► Start timer
  │
  ├─► Service Code
  │    ├─► recordCertificateIssued(issuerId)
  │    │    └─► Increment counter
  │    │
  │    ├─► recordAuthenticationAttempt(success)
  │    │    └─► Increment counter
  │    │
  │    └─► Other metrics recording
  │
  ├─► Response
  │    └─► MetricsMiddleware records duration
  │
  └─► Prometheus Registry
       └─► Store metrics
           ├─► Counters (total requests, errors, operations)
           ├─► Histograms (latencies)
           └─► Ready for /api/metrics endpoint
```

---

## Module Dependencies

```
┌────────────────────────┐
│   app.module.ts        │
├────────────────────────┤
│ imports:               │
│ • ConfigModule         │
│ • TypeOrmModule        │
│ • CommonModule    ◄────┼─── New
│ • HealthModule    ◄────┼─── New
│ • AuthModule           │
│ • UsersModule          │
│ • CertificatesModule   │
│ • IssuersModule        │
└────────────────────────┘
         │
         ├─► CommonModule
         │    ├─► LoggingService
         │    ├─► MetricsService
         │    ├─► SentryService
         │    ├─► CorrelationIdMiddleware
         │    └─► MetricsMiddleware
         │
         └─► HealthModule
              ├─► HealthController
              ├─► MetricsController
              ├─► DatabaseHealthIndicator
              └─► StellarHealthIndicator
```

---

## API Endpoints Structure

```
/api/
├── health/                    (HealthController)
│   ├── GET /               → General health
│   ├── GET /live           → Liveness probe
│   ├── GET /ready          → Readiness probe
│   ├── GET /database       → Database check
│   └── GET /stellar        → Stellar network check
│
├── metrics/                   (MetricsController)
│   ├── GET /               → Prometheus metrics
│   └── GET /health         → Metrics endpoint health
│
├── auth/                      (AuthModule)
│   ├── POST /login
│   ├── POST /register
│   └── POST /refresh-token
│
├── certificates/              (CertificatesModule)
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   └── PATCH /:id
│
├── users/                     (UsersModule)
│   ├── GET /
│   ├── GET /:id
│   └── PATCH /:id
│
├── issuers/                   (IssuersModule)
│   ├── GET /
│   ├── POST /
│   └── GET /:id
│
└── docs                       (Swagger)
    └── GET /               → OpenAPI documentation
```

---

## Kubernetes Integration

### Pod Lifecycle with Health Checks

```
┌──────────────┐
│ Pod Created  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Startup (15s delay)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Readiness Probe              │
│ GET /api/health/ready        │  ◄── Every 5s
│ (checking dependencies)       │
└──────┬───────────────────────┘
       │ [Failed 3 times in 15s]
       ├─► Pod marked NOT Ready ─────► No traffic routed
       │
       │ [Success]
       ├─► Pod marked Ready ─────────► Traffic routed
       │
       ▼
┌──────────────────────────────┐
│ Liveness Probe               │
│ GET /api/health/live         │  ◄── Every 10s
│ (checking if running)         │
└──────┬───────────────────────┘
       │ [Failed 3 times in 30s]
       ├─► Pod marked UNHEALTHY ──────► Pod restarted
       │
       │ [Success]
       └─► Pod stays alive
```

---

## Monitoring Stack Integration

```
┌──────────────────────────────────────┐
│     Your Application                 │
│     /api/metrics ◄─────────────┐     │
└──────────────────────────────────────┘
            ▲
            │ (scrape every 15s)
            │
     ┌──────┴──────────┐
     │                 │
     ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Prometheus   │  │ Sentry       │
├──────────────┤  ├──────────────┤
│ • Scrapes    │  │ • Captures   │
│   metrics    │  │   errors     │
│ • Time-series│  │ • Tracks     │
│   storage    │  │   exceptions │
│ • Alerting   │  │ • Breadcrumbs│
└──────┬───────┘  └──────────────┘
       │
       ▼
┌──────────────────┐
│ Grafana          │
├──────────────────┤
│ • Visualizations │
│ • Dashboards     │
│ • Alerts         │
└──────────────────┘
```

---

## Logging Stack Integration

```
Application
  ├─► stdout (JSON logs)
  │    ├── { timestamp, level, message, correlationId, userId, ... }
  │    │
  │    └─► Log Aggregation (ELK/Loki/etc.)
  │         ├─► Parse JSON
  │         ├─► Index by correlationId
  │         └─► Full-text search
  │
  └─► stderr (same format)
       └─► Error aggregation
```

---

## Response Header Propagation

```
┌──────────────────────────────┐
│ Client Request               │
│ Headers:                     │
│  x-correlation-id: abc-123   │ (optional)
└──────────────────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ CorrelationIdMiddleware      │
│ • Extract or generate UUID   │
│ • Store in context           │
└──────────────────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ Request Processing           │
│ • All logs include id        │
│ • All services receive it    │
│ • DB queries tagged with it  │
└──────────────────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ Client Response              │
│ Headers:                     │
│  x-correlation-id: abc-123   │ (echoed back)
│  x-request-id: xyz-789       │
└──────────────────────────────┘
```

---

## Error Capture Path

```
Unhandled Exception
       │
       ▼
┌──────────────────────────┐
│ Global Exception Handler │
│ (NestJS built-in)        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ HttpExceptionFilter      │
├──────────────────────────┤
│ 1. Extract error info    │
│ 2. Add correlation ID    │
│ 3. Log structured entry  │
│ 4. If status >= 500:     │
│    └─► SentryService.    │
│        captureException()│
└────────────┬─────────────┘
             │
       ┌─────┴─────────────┐
       │                   │
       ▼                   ▼
   ┌────────┐          ┌──────────┐
   │ Logging│          │ Sentry   │
   │Service │          │Dashboard │
   └────────┘          └──────────┘
       │
       ▼
   stderr JSON
```

---

This architecture diagram provides a complete overview of how all monitoring components interact within the Kaystcx backend system.
