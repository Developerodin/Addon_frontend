# Docker Hub Deployment Guide

This guide explains how to build, push, and run the Addon Frontend Docker image from Docker Hub.

## Prerequisites

1. Docker installed on your system
2. Docker Hub account (create one at https://hub.docker.com)
3. Docker Hub username

## Step 1: Build and Push to Docker Hub

### Option A: Using the Build Script (Recommended)

1. Make the script executable:
   ```bash
   chmod +x docker-build.sh
   ```

2. Build and push the image:
   ```bash
   ./docker-build.sh [version] [dockerhub-username]
   ```
   
   Example:
   ```bash
   ./docker-build.sh 1.0.0 myusername
   ```

   This will:
   - Build the Docker image
   - Tag it with the version and `latest`
   - Optionally push to Docker Hub

### Option B: Manual Build and Push

1. **Login to Docker Hub:**
   ```bash
   docker login
   ```

2. **Build the image:**
   ```bash
   docker build -t your-username/addon-frontend:latest .
   ```

3. **Tag with version (optional):**
   ```bash
   docker tag your-username/addon-frontend:latest your-username/addon-frontend:1.0.0
   ```

4. **Push to Docker Hub:**
   ```bash
   # Push latest
   docker push your-username/addon-frontend:latest
   
   # Push versioned tag
   docker push your-username/addon-frontend:1.0.0
   ```

## Step 2: Client Deployment (Running on Alpine/Any Linux)

### Option A: Using the Run Script

1. Make the script executable:
   ```bash
   chmod +x docker-run.sh
   ```

2. Run the container:
   ```bash
   ./docker-run.sh [dockerhub-username] [version]
   ```
   
   Example:
   ```bash
   ./docker-run.sh myusername latest
   ```

### Option B: Manual Run

1. **Pull the image:**
   ```bash
   docker pull your-username/addon-frontend:latest
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name addon-frontend \
     -p 3000:3000 \
     --restart unless-stopped \
     your-username/addon-frontend:latest
   ```

3. **Access the application:**
   - Open browser: `http://localhost:3000`
   - Or from another machine: `http://[server-ip]:3000`

## Docker Commands Reference

### Container Management

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs
docker logs -f addon-frontend

# Stop container
docker stop addon-frontend

# Start container
docker start addon-frontend

# Restart container
docker restart addon-frontend

# Remove container
docker rm -f addon-frontend

# View container stats
docker stats addon-frontend
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi your-username/addon-frontend:latest

# Remove unused images
docker image prune -a
```

## Environment Variables

You can pass environment variables when running the container:

```bash
docker run -d \
  --name addon-frontend \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --restart unless-stopped \
  your-username/addon-frontend:latest
```

## Using Docker Compose

A production-ready `docker-compose.prod.yml` file is included. To use it:

1. **Edit the file** and replace `your-username` with your Docker Hub username:
   ```yaml
   image: your-username/addon-frontend:latest
   ```

2. **Pull and run:**
   ```bash
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

4. **Stop:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

## Production Deployment on Alpine Linux

### Install Docker on Alpine

```bash
# Update package index
apk update

# Install Docker
apk add docker docker-compose

# Start Docker service
service docker start

# Enable Docker on boot
rc-update add docker boot
```

### Run the Application

```bash
# Pull and run
docker pull your-username/addon-frontend:latest
docker run -d --name addon-frontend -p 3000:3000 --restart unless-stopped your-username/addon-frontend:latest
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change the port mapping:

```bash
docker run -d \
  --name addon-frontend \
  -p 8080:3000 \
  --restart unless-stopped \
  your-username/addon-frontend:latest
```

Then access at `http://localhost:8080`

### Container Won't Start

1. Check logs:
   ```bash
   docker logs addon-frontend
   ```

2. Check if container exists:
   ```bash
   docker ps -a | grep addon-frontend
   ```

3. Remove and recreate:
   ```bash
   docker rm -f addon-frontend
   docker run -d --name addon-frontend -p 3000:3000 your-username/addon-frontend:latest
   ```

### Permission Issues on Alpine

If you encounter permission issues:

```bash
# Add user to docker group
adduser -D -s /bin/sh dockeruser
addgroup dockeruser docker

# Or run with sudo
sudo docker run -d --name addon-frontend -p 3000:3000 your-username/addon-frontend:latest
```

## Security Best Practices

1. **Don't commit sensitive data** - Use environment variables or Docker secrets
2. **Use specific versions** - Avoid `latest` tag in production
3. **Regular updates** - Keep images updated with security patches
4. **Network security** - Use reverse proxy (nginx/traefik) with SSL
5. **Resource limits** - Set memory and CPU limits:

```bash
docker run -d \
  --name addon-frontend \
  -p 3000:3000 \
  --memory="512m" \
  --cpus="1.0" \
  --restart unless-stopped \
  your-username/addon-frontend:latest
```

## Updating the Application

To update to a new version:

```bash
# Stop and remove old container
docker stop addon-frontend
docker rm addon-frontend

# Pull new image
docker pull your-username/addon-frontend:latest

# Run new container
docker run -d --name addon-frontend -p 3000:3000 --restart unless-stopped your-username/addon-frontend:latest
```

Or use the run script:
```bash
./docker-run.sh your-username latest
```
