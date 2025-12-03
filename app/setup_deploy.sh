#!/bin/bash

# Trello Clone Deployment Script
# This script deploys the application to the production server

set -e

# Configuration
DEPLOY_HOST=${DEPLOY_HOST:-"teamtrello.lab.home.lucasacchi.net"}
DEPLOY_USER=${DEPLOY_USER:-"teamtrello"}
DEPLOY_PATH="/home/${DEPLOY_USER}/trello-clone"

echo "=== Trello Clone Deployment Script ==="
echo "Deploying to: ${DEPLOY_USER}@${DEPLOY_HOST}"
echo ""

# Build the frontend
echo "Building frontend..."
cd client && npm run build && cd ..

# Create deployment package
echo "Creating deployment package..."
tar -czf deploy.tar.gz \
  index.js \
  client/dist \
  package.json \
  .env.example

# Deploy to server
echo "Deploying to server..."
scp deploy.tar.gz ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/

ssh ${DEPLOY_USER}@${DEPLOY_HOST} << 'ENDSSH'
  set -e
  
  # Create deployment directory
  mkdir -p ~/trello-clone
  cd ~/trello-clone
  
  # Extract deployment package
  tar -xzf /tmp/deploy.tar.gz
  rm /tmp/deploy.tar.gz
  
  # Install dependencies
  npm install --production
  
  # Set up environment
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "Please edit .env file with your production settings"
  fi
  
  # Restart application with PM2
  if command -v pm2 &> /dev/null; then
    pm2 restart trello-clone || pm2 start index.js --name trello-clone
    pm2 save
  else
    echo "PM2 not installed. Install with: npm install -g pm2"
    echo "Then run: pm2 start index.js --name trello-clone"
  fi
  
  echo "Deployment complete!"
ENDSSH

# Cleanup
rm deploy.tar.gz

echo ""
echo "=== Deployment Complete ==="
echo "Your application should now be running at: http://${DEPLOY_HOST}"
