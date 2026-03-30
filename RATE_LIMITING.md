# Rate Limiting for Public Verification Endpoint

## Overview

The StellarCert platform implements IP-based rate limiting on the public certificate verification endpoint to prevent abuse and brute-force attacks. This security feature ensures fair usage while maintaining availability for legitimate verification requests.

## Configuration

Rate limiting is configurable through environment variables:

```env
# Verification endpoint rate limiting
VERIFICATION_RATE_LIMIT_WINDOW_MS=60000        # 1 minute window (default)
VERIFICATION_RATE_LIMIT_MAX_REQUESTS=100       # 100 requests per window (default)
```

## How It Works

### IP Detection
The system detects client IP addresses using the following priority:
1. `X-Forwarded-For` header (for proxy/load balancer setups)
2. `X-Real-IP` header
3. Connection remote address

### Rate Limiting Logic
- **Window**: Sliding time window (default: 60 seconds)
- **Limit**: Maximum requests per window per IP (default: 100)
- **Cleanup**: Automatic cleanup of expired rate limit entries

### Response Headers
When rate limiting is active, the following headers are included:
```
X-RateLimit-Limit: 100          # Maximum requests allowed
X-RateLimit-Remaining: 95       # Remaining requests in current window
X-RateLimit-Reset: 1640995200000 # Timestamp when limit resets
```

## API Endpoint

### Public Certificate Verification
```http
GET /certificates/verify?serial={verification_code}
```

**Rate Limited**: Yes (IP-based)
**Authentication**: None required (public endpoint)

**Response (Success)**:
```json
{
  "id": "certificate-uuid",
  "title": "Certificate Title",
  "recipientName": "John Doe",
  "recipientEmail": "john@example.com",
  "status": "active",
  "issuedAt": "2024-01-01T00:00:00.000Z",
  "expiresAt": "2025-01-01T00:00:00.000Z",
  "issuer": {
    "name": "Issuer Name",
    "website": "https://issuer.com"
  },
  "verificationCode": "AB12CD34"
}
```

**Response (Rate Limited)**:
```json
HTTP/1.1 429 Too Many Requests
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

## Monitoring

### Rate Limit Status Endpoint
```http
GET /rate-limit/verification-limits
GET /rate-limit/verification-limits?ip=192.168.1.100
```

**Response**:
```json
{
  "ip": "192.168.1.100",
  "status": {
    "count": 23,
    "resetTime": 1640995200000,
    "remaining": 77
  }
}
```

## Security Benefits

1. **Brute Force Protection**: Prevents automated scanning of verification codes
2. **DDoS Mitigation**: Limits impact of distributed attacks
3. **Fair Usage**: Ensures equitable access for all users
4. **Monitoring**: Provides visibility into usage patterns

## Implementation Details

### IpRateLimitGuard
- **Location**: `src/common/guards/ip-rate-limit.guard.ts`
- **Storage**: In-memory Map (suitable for single-instance deployments)
- **Thread Safety**: Single-threaded Node.js ensures consistency
- **Memory Management**: Automatic cleanup of expired entries

### Scaling Considerations

For multi-instance deployments, consider:
- Redis-based storage for distributed rate limiting
- Load balancer sticky sessions
- Centralized rate limiting service

## Testing

### Manual Testing
```bash
# Test rate limiting with curl
for i in {1..105}; do
  curl -s "http://localhost:3000/certificates/verify?serial=TEST123" &
done

# Check rate limit headers
curl -v "http://localhost:3000/certificates/verify?serial=TEST123"
```

### Automated Testing
```typescript
// Test rate limit enforcement
describe('Rate Limiting', () => {
  it('should enforce rate limits', async () => {
    // Make 101 requests rapidly
    const promises = Array(101).fill().map(() =>
      request(app.getHttpServer())
        .get('/certificates/verify?serial=TEST123')
    );

    const results = await Promise.allSettled(promises);
    const rejected = results.filter(r => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

1. **Rate Limit Not Working**
   - Check environment variables are set correctly
   - Verify IpRateLimitGuard is applied to the endpoint
   - Check IP detection logic for proxy headers

2. **False Positives**
   - Review IP detection logic
   - Check for shared IP addresses (NAT, proxies)
   - Adjust rate limits if too restrictive

3. **Memory Usage**
   - Monitor rate limit map size
   - Implement Redis for large-scale deployments
   - Adjust cleanup intervals if needed

### Logs
Rate limiting events are logged with the following levels:
- `warn`: Rate limit exceeded
- `debug`: Rate limit status checks
- `info`: Configuration changes

## Configuration Examples

### Development
```env
VERIFICATION_RATE_LIMIT_WINDOW_MS=60000
VERIFICATION_RATE_LIMIT_MAX_REQUESTS=1000  # More permissive for testing
```

### Production
```env
VERIFICATION_RATE_LIMIT_WINDOW_MS=60000
VERIFICATION_RATE_LIMIT_MAX_REQUESTS=100   # Stricter limits
```

### High-Traffic Scenarios
```env
VERIFICATION_RATE_LIMIT_WINDOW_MS=30000    # 30 second windows
VERIFICATION_RATE_LIMIT_MAX_REQUESTS=50    # Lower limits
```