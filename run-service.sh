#!/bin/bash

# Quick script to run any microservice
# Usage: ./run-service.sh <service-name> [port]

SERVICE=$1
PORT=$2

# Default ports for each service
declare -A PORTS=(
  ["auth-service"]=8081
  ["user-service"]=8082
  ["event-service"]=8083
  ["transaction-service"]=8084
  ["admin-service"]=8085
  ["upload-service"]=8086
  ["api-gateway"]=8087
)

if [ -z "$SERVICE" ]; then
  echo "Usage: $0 <service-name> [port]"
  echo ""
  echo "Available services:"
  for svc in "${!PORTS[@]}"; do
    echo "  - $svc (default port: ${PORTS[$svc]})"
  done
  exit 1
fi

# Use provided port or default
SERVICE_PORT=${PORT:-${PORTS[$SERVICE]}}

if [ -z "$SERVICE_PORT" ]; then
  echo "Error: Unknown service '$SERVICE'"
  echo "Available services: ${!PORTS[@]}"
  exit 1
fi

SERVICE_DIR="microservices/$SERVICE"

if [ ! -d "$SERVICE_DIR" ]; then
  echo "Error: Service directory '$SERVICE_DIR' not found"
  exit 1
fi

# Check if port is already in use
check_port() {
  local port=$1
  if command -v lsof > /dev/null 2>&1; then
    if lsof -i :$port > /dev/null 2>&1; then
      return 0  # Port is in use
    fi
  elif command -v netstat > /dev/null 2>&1; then
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
      return 0  # Port is in use
    fi
  elif command -v ss > /dev/null 2>&1; then
    if ss -tlnp 2>/dev/null | grep -q ":$port "; then
      return 0  # Port is in use
    fi
  fi
  return 1  # Port is free
}

# Kill process on port if requested
kill_port() {
  local port=$1
  echo "⚠️  Port $port is already in use"
  
  if command -v lsof > /dev/null 2>&1; then
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
      echo "🛑 Killing process $pid on port $port..."
      kill -9 $pid 2>/dev/null
      sleep 1
      return 0
    fi
  fi
  
  # Try pkill as fallback
  pkill -f "tsx.*$SERVICE" 2>/dev/null
  pkill -f "node.*$port" 2>/dev/null
  sleep 1
}

# Check if port is already in use
if check_port $SERVICE_PORT; then
  echo "⚠️  Port $SERVICE_PORT is already in use!"
  echo ""
  echo "Options:"
  echo "  1. Kill the existing process and start new one"
  echo "  2. Use a different port"
  echo "  3. Exit"
  echo ""
  read -p "Choose option (1/2/3) [default: 1]: " choice
  choice=${choice:-1}
  
  case $choice in
    1)
      kill_port $SERVICE_PORT
      if check_port $SERVICE_PORT; then
        echo "❌ Failed to free port $SERVICE_PORT. Please manually kill the process."
        exit 1
      else
        echo "✅ Port $SERVICE_PORT is now free"
      fi
      ;;
    2)
      read -p "Enter new port number: " new_port
      SERVICE_PORT=$new_port
      ;;
    3)
      echo "Exiting..."
      exit 0
      ;;
    *)
      echo "Invalid choice. Exiting..."
      exit 1
      ;;
  esac
fi

echo "🚀 Starting $SERVICE on port $SERVICE_PORT..."

cd "$SERVICE_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Create symlink to shared directory if it doesn't exist
if [ ! -L "shared" ] && [ ! -d "shared" ]; then
  echo "🔗 Creating symlink to shared directory..."
  ln -sf ../shared shared
fi

# Check if .env exists, if not use inline env vars
if [ -f "../../.env" ]; then
  echo "✅ Using .env file from parent directory"
  export $(cat ../../.env | grep -v '^#' | xargs)
fi

# Set default environment variables if not set
export NODE_ENV=${NODE_ENV:-development}
export PORT=$SERVICE_PORT
export CLIENT_URL=${CLIENT_URL:-http://localhost:3000}
export JWT_SECRET=${JWT_SECRET:-test-secret-key-min-32-chars-long-for-development}
export DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/evently}

echo "🌐 Service will be available at: http://localhost:$SERVICE_PORT"
echo "🏥 Health check: http://localhost:$SERVICE_PORT/health"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

# Run the service
npx tsx src/index.ts

