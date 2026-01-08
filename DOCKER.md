# Docker Setup Guide

This project is containerized using Docker for easy deployment and development.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Using Docker directly

```bash
# Build the image
docker build -t addon-frontend:latest .

# Run the container
docker run -d -p 3000:3000 --name addon-frontend addon-frontend:latest

# View logs
docker logs -f addon-frontend

# Stop and remove the container
docker stop addon-frontend
docker rm addon-frontend
```

## Accessing the Application

Once the container is running, access the application at:
- **URL**: http://localhost:3000

## Container Management

### Check container status
```bash
docker ps --filter name=addon_frontend
```

### View container logs
```bash
docker-compose logs -f frontend
# or
docker logs -f addon_frontend-frontend-1
```

### Restart the container
```bash
docker-compose restart
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

## Health Check

The container includes a health check that verifies the application is responding. Check health status:

```bash
docker ps
# Look for "healthy" status in the STATUS column
```

## Environment Variables

You can customize the application by setting environment variables in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - NEXT_TELEMETRY_DISABLED=1
  # Add your custom environment variables here
```

## Troubleshooting

### Container won't start
1. Check if port 3000 is already in use:
   ```bash
   lsof -i :3000
   ```
2. View container logs for errors:
   ```bash
   docker-compose logs frontend
   ```

### Rebuild from scratch
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Clean up Docker resources
```bash
# Remove containers, networks, and volumes
docker-compose down -v

# Remove unused images
docker image prune -a
```

## Production Deployment

For production deployment, consider:
- Using a reverse proxy (nginx, traefik)
- Setting up SSL/TLS certificates
- Configuring proper environment variables
- Setting up monitoring and logging
- Using Docker secrets for sensitive data




