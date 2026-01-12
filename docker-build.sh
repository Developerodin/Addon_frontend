#!/bin/bash

# Docker Build and Push Script for Addon Frontend
# Usage: ./docker-build.sh [version] [dockerhub-username]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get version from argument or use default
VERSION=${1:-latest}
DOCKERHUB_USERNAME=${2:-""}

# Image name
IMAGE_NAME="addon-frontend"

if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo -e "${YELLOW}Usage: ./docker-build.sh [version] [dockerhub-username]${NC}"
    echo -e "${YELLOW}Example: ./docker-build.sh 1.0.0 myusername${NC}"
    echo ""
    echo -e "${RED}Error: Docker Hub username is required${NC}"
    exit 1
fi

FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${VERSION}"
LATEST_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:latest"

echo -e "${GREEN}Building Docker image: ${FULL_IMAGE_NAME}${NC}"

# Build the Docker image
docker build -t "${FULL_IMAGE_NAME}" -t "${LATEST_IMAGE_NAME}" .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}Do you want to push to Docker Hub? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${GREEN}Pushing ${FULL_IMAGE_NAME} to Docker Hub...${NC}"
    docker push "${FULL_IMAGE_NAME}"
    
    if [ "$VERSION" != "latest" ]; then
        echo -e "${GREEN}Pushing ${LATEST_IMAGE_NAME} to Docker Hub...${NC}"
        docker push "${LATEST_IMAGE_NAME}"
    fi
    
    echo -e "${GREEN}✓ Push successful!${NC}"
    echo -e "${GREEN}Your image is available at:${NC}"
    echo -e "  - ${FULL_IMAGE_NAME}"
    echo -e "  - ${LATEST_IMAGE_NAME}"
    echo ""
    echo -e "${YELLOW}To run the image:${NC}"
    echo -e "  docker run -d -p 3000:3000 --name addon-frontend ${LATEST_IMAGE_NAME}"
else
    echo -e "${YELLOW}Image built but not pushed. You can push it later with:${NC}"
    echo -e "  docker push ${FULL_IMAGE_NAME}"
    if [ "$VERSION" != "latest" ]; then
        echo -e "  docker push ${LATEST_IMAGE_NAME}"
    fi
fi
