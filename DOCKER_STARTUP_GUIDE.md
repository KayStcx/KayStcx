# Kaystcx Docker Startup Guide

## Quick Start

To start the entire Kaystcx application using Docker Compose:

```bash
# Start all services in development mode
docker-compose up --build

# Start services in detached mode (run in background)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean restart)
docker-compose down -v
```

## Service URLs

Once all services are running, you can access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics (if enabled)

## Optional Services

### Production Mode (with Nginx)

```bash
# Start with Nginx reverse proxy
docker-compose --profile production up --build
```

### Monitoring (with Prometheus)

```bash
# Start with Prometheus monitoring
docker-compose --profile monitoring up --build
```

### Production + Monitoring

```bash
# Start with both Nginx and Prometheus
docker-compose --profile production --profile monitoring up --build
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Stellar Configuration
STELLAR_ISSUER_SECRET_KEY=your_stellar_secret_key_here
STELLAR_ISSUER_PUBLIC_KEY=your_stellar_public_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=3600

# Optional: Sentry for error tracking
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id

# Optional: Email configuration
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USERNAME=your_email@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@example.com
```

### Using the Example Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your specific configuration
```

## Service Dependencies

The services start in the following order:

1. **PostgreSQL** - Database service
2. **Redis** - Cache and job queue service
3. **Backend** - API service (waits for database and Redis)
4. **Frontend** - Web application (waits for backend)

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 5432, 6379, 3000, and 5173 are available
2. **Environment variables**: Check that all required environment variables are set
3. **Database migrations**: The backend will automatically run database migrations

### Reset Everything

```bash
# Stop all services
docker-compose down

# Remove all volumes (this will delete your data)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up --build
```

### View Service Status

```bash
# Check service status
docker-compose ps

# View logs for a specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f backend
```

## Development Workflow

### Making Changes

1. **Frontend changes**: The frontend container will automatically reload
2. **Backend changes**: You may need to restart the backend service:
   ```bash
   docker-compose restart backend
   ```
3. **Database changes**: You may need to rebuild:
   ```bash
   docker-compose up --build --force-recreate backend
   ```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U kaystcx_user -d kaystcx

# Connect to Redis
docker-compose exec redis redis-cli
```

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your `.env` file
2. Use the production profile:
   ```bash
   docker-compose --profile production up -d
   ```
3. Configure SSL certificates in the `nginx/ssl` directory
4. Update the `nginx/nginx.conf` file with your domain configuration

## Health Checks

Each service has built-in health checks:

- **PostgreSQL**: Checks database connectivity
- **Redis**: Pings the Redis server
- **Backend**: Checks `/health` endpoint
- **Frontend**: Checks if the web server is responding

Services will only start after their dependencies are healthy.
