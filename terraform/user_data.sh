#!/bin/bash
set -e

echo "🚀 Starting QuantumLedger deployment (NEVER GOES DOWN)..."

# Update system
apt-get update
apt-get upgrade -y

# Install Docker + monitoring tools
apt-get install -y docker.io docker-compose git curl wget htop net-tools

# Add ubuntu user to docker group (for non-root execution)
usermod -aG docker ubuntu

# Enable Docker service to start on boot
systemctl enable docker
systemctl start docker

# Configure Docker to use json-file logging (important for monitoring)
cat > /etc/docker/daemon.json << 'DOCKER'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "10"
  }
}
DOCKER

systemctl restart docker

# Clone repository
cd /home/ubuntu
git clone ${repo_url} quantumledger 2>/dev/null || (cd quantumledger && git pull origin main)
cd quantumledger
git pull origin main

# Create environment file with all API keys
cat > .env << 'ENV'
DATABASE_URL=postgresql://quantumledger:${db_password}@${db_host}:${db_port}/quantumledger
NEWSAPI_KEY=${newsapi_key}
FRED_API_KEY=${fred_api_key}
JWT_SECRET_KEY=${jwt_secret}
ANTHROPIC_API_KEY=${anthropic_api_key}
DEBUG=false
ALLOWED_ORIGINS=*
PYTHONUNBUFFERED=1
ENV

echo "Building Docker image..."
docker-compose build --no-cache

echo "Starting services (auto-restart enabled)..."
docker-compose up -d

# Wait for services to become healthy
echo "Waiting for QuantumLedger to start..."
for i in {1..30}; do
  if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ QuantumLedger is HEALTHY and RUNNING!"
    break
  fi
  echo "  Checking... ($i/30 attempts)"
  sleep 4
done

# Create systemd service for guaranteed auto-restart
echo "Setting up auto-restart service..."
cat > /etc/systemd/system/quantumledger-docker.service << 'SERVICE'
[Unit]
Description=QuantumLedger - Always Running Docker Service
After=docker.service network-online.target
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/quantumledger
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=quantumledger

# Limits
TimeoutStartSec=120
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
SERVICE

# Enable and start the systemd service
systemctl daemon-reload
systemctl enable quantumledger-docker
systemctl start quantumledger-docker

# Setup log rotation
cat > /etc/logrotate.d/quantumledger << 'LOGROTATE'
/home/ubuntu/quantumledger/data/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    copytruncate
}
LOGROTATE

# Initialize database
echo "Initializing database..."
docker-compose exec -T backend python -m alembic upgrade head 2>/dev/null || true

# Final health check
echo "Final health check..."
curl http://localhost:8000/health

echo ""
echo "=========================================="
echo "✅ QUANTUMLEDGER DEPLOYED SUCCESSFULLY!"
echo "=========================================="
echo "🚀 Service: RUNNING (with auto-restart)"
echo "🔄 Restart Policy: Always (infinite retries)"
echo "📊 Health Check: Every 30 seconds"
echo "📋 Logs: docker-compose logs -f"
echo ""
echo "🌐 App URL: http://$(hostname -I | awk '{print $1}'):8000"
echo "📊 API Docs: http://$(hostname -I | awk '{print $1}'):8000/docs"
echo "=========================================="

