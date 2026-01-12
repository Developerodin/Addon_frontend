#!/bin/bash

# Docker Run Script for Addon Frontend
# Usage: ./docker-run.sh [dockerhub-username] [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get arguments
DOCKERHUB_USERNAME=${1:-""}
VERSION=${2:-latest}

# Image name
IMAGE_NAME="addon-frontend"

if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo -e "${YELLOW}Usage: ./docker-run.sh [dockerhub-username] [version]${NC}"
    echo -e "${YELLOW}Example: ./docker-run.sh myusername 1.0.0${NC}"
    echo ""
    echo -e "${RED}Error: Docker Hub username is required${NC}"
    exit 1
fi

FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${VERSION}"
CONTAINER_NAME="addon-frontend"

echo -e "${GREEN}Pulling Docker image: ${FULL_IMAGE_NAME}${NC}"

# Pull the Docker image
docker pull "${FULL_IMAGE_NAME}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Image pulled successfully!${NC}"
else
    echo -e "${RED}✗ Failed to pull image!${NC}"
    exit 1
fi

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
    echo -e "${YELLOW}Removing existing container...${NC}"
    docker rm "${CONTAINER_NAME}" > /dev/null 2>&1 || true
fi

echo -e "${GREEN}Starting container: ${CONTAINER_NAME}${NC}"

# Run the container
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p 3000:3000 \
  --restart unless-stopped \
  "${FULL_IMAGE_NAME}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Container started successfully!${NC}"
    echo ""
    echo -e "${GREEN}Container is running at:${NC}"
    echo -e "  - http://localhost:3000"
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo -e "  View logs:    docker logs -f ${CONTAINER_NAME}"
    echo -e "  Stop:         docker stop ${CONTAINER_NAME}"
    echo -e "  Start:        docker start ${CONTAINER_NAME}"
    echo -e "  Remove:       docker rm -f ${CONTAINER_NAME}"
else
    echo -e "${RED}✗ Failed to start container!${NC}"
    exit 1
fi
