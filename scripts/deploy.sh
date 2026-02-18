#!/bin/bash
# Deploy forum apps to QNAP NAS
# Builds linux/amd64 images locally, transfers them, and runs them on the NAS
set -e

NAS_HOST="192.168.0.178"
NAS_USER="rraaij"
# QNAP Container Station installs docker outside the default PATH
DOCKER=/share/CACHEDEV1_DATA/.qpkg/container-station/bin/docker

# API URL that the forum app will call (both SSR and browser in production)
# This is the external NAS host:port where the API container is accessible
API_URL="http://$NAS_HOST:4000"

# ─────────────────────────────────────────────────────────
# Deploy API
# ─────────────────────────────────────────────────────────
API_IMAGE="forum-api"
API_CONTAINER="forum-api"
API_VERSION=$(node -p "require('./packages/api/package.json').version")

DEPLOYED_API_VERSION=$(ssh -o ConnectTimeout=5 "$NAS_USER@$NAS_HOST" \
  "$DOCKER inspect --format '{{index .Config.Labels \"app.version\"}}' $API_CONTAINER 2>/dev/null" || echo "none")

if [ "$API_VERSION" = "$DEPLOYED_API_VERSION" ]; then
  echo "API v$API_VERSION is already deployed. Bump version in packages/api/package.json to redeploy."
else
  echo "Building API image (v$API_VERSION, was: $DEPLOYED_API_VERSION)..."
  docker build --platform linux/amd64 \
    --label "app.version=$API_VERSION" \
    -f Dockerfile.api \
    -t "$API_IMAGE" .

  echo "Transferring API image..."
  docker save "$API_IMAGE" | gzip > /tmp/"$API_IMAGE".tar.gz
  scp /tmp/"$API_IMAGE".tar.gz "$NAS_USER@$NAS_HOST":/tmp/

  echo "Transferring .env.api to NAS..."
  scp .env.api "$NAS_USER@$NAS_HOST":~/.env.forum-api

  echo "Deploying API on NAS..."
  ssh "$NAS_USER@$NAS_HOST" << DEPLOY
    $DOCKER load < /tmp/$API_IMAGE.tar.gz
    $DOCKER stop $API_CONTAINER 2>/dev/null || true
    $DOCKER rm $API_CONTAINER 2>/dev/null || true
    $DOCKER run -d \
      --name $API_CONTAINER \
      --restart unless-stopped \
      -p 4000:4000 \
      --env-file ~/.env.forum-api \
      $API_IMAGE
    rm /tmp/$API_IMAGE.tar.gz
    echo "API container started:"
    $DOCKER ps --filter name=$API_CONTAINER
DEPLOY

  rm /tmp/"$API_IMAGE".tar.gz
  echo "API v$API_VERSION deployed at http://$NAS_HOST:4000"
fi

# ─────────────────────────────────────────────────────────
# Deploy Forum App
# ─────────────────────────────────────────────────────────
FORUM_IMAGE="forum-app"
FORUM_CONTAINER="forum-app"
FORUM_VERSION=$(node -p "require('./apps/forum/package.json').version")

DEPLOYED_FORUM_VERSION=$(ssh -o ConnectTimeout=5 "$NAS_USER@$NAS_HOST" \
  "$DOCKER inspect --format '{{index .Config.Labels \"app.version\"}}' $FORUM_CONTAINER 2>/dev/null" || echo "none")

if [ "$FORUM_VERSION" = "$DEPLOYED_FORUM_VERSION" ]; then
  echo "Forum v$FORUM_VERSION is already deployed. Bump version in apps/forum/package.json to redeploy."
else
  echo "Building Forum image (v$FORUM_VERSION, was: $DEPLOYED_FORUM_VERSION)..."
  docker build --platform linux/amd64 \
    --label "app.version=$FORUM_VERSION" \
    --build-arg "VITE_API_URL=$API_URL" \
    -t "$FORUM_IMAGE" .

  echo "Transferring Forum image..."
  docker save "$FORUM_IMAGE" | gzip > /tmp/"$FORUM_IMAGE".tar.gz
  scp /tmp/"$FORUM_IMAGE".tar.gz "$NAS_USER@$NAS_HOST":/tmp/

  echo "Transferring .env.forum to NAS..."
  scp .env.forum "$NAS_USER@$NAS_HOST":~/.env.forum-app

  echo "Deploying Forum on NAS..."
  ssh "$NAS_USER@$NAS_HOST" << DEPLOY
    $DOCKER load < /tmp/$FORUM_IMAGE.tar.gz
    $DOCKER stop $FORUM_CONTAINER 2>/dev/null || true
    $DOCKER rm $FORUM_CONTAINER 2>/dev/null || true
    $DOCKER run -d \
      --name $FORUM_CONTAINER \
      --restart unless-stopped \
      -p 3001:3001 \
      --env-file ~/.env.forum-app \
      $FORUM_IMAGE
    rm /tmp/$FORUM_IMAGE.tar.gz
    echo "Forum container started:"
    $DOCKER ps --filter name=$FORUM_CONTAINER
DEPLOY

  rm /tmp/"$FORUM_IMAGE".tar.gz
  echo "Forum v$FORUM_VERSION deployed at http://$NAS_HOST:3001"
fi
