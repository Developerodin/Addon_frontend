# Quick Start - Docker Hub Deployment

## Build and Push to Docker Hub

```bash
# 1. Login to Docker Hub
docker login

# 2. Build and push (using script)
./docker-build.sh 1.0.0 your-dockerhub-username

# OR manually:
docker build -t your-username/addon-frontend:latest .
docker push your-username/addon-frontend:latest
```

## Client Runs on Alpine/Any Linux

```bash
# Option 1: Using script
./docker-run.sh your-username latest

# Option 2: Using docker-compose
# Edit docker-compose.prod.yml and replace 'your-username'
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Option 3: Manual
docker pull your-username/addon-frontend:latest
docker run -d --name addon-frontend -p 3000:3000 --restart unless-stopped your-username/addon-frontend:latest
```

## Access Application

- Local: http://localhost:3000
- Network: http://[server-ip]:3000

## Useful Commands

```bash
# View logs
docker logs -f addon-frontend

# Stop/Start
docker stop addon-frontend
docker start addon-frontend

# Remove
docker rm -f addon-frontend
```

For detailed instructions, see `DOCKER_HUB_GUIDE.md`
