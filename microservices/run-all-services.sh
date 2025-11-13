#!/bin/bash

# Script to run all microservices at once
# Usage: ./run-all-services.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

echo ""
print_info "=========================================="
print_info "Starting All Microservices"
print_info "=========================================="
echo ""

# Check if we're in the microservices directory
if [ ! -f "run-service.sh" ]; then
  print_warning "Please run this script from the microservices directory"
  exit 1
fi

# Array of services with their ports
declare -a SERVICES=(
  "auth-service:8001"
  "user-service:8002"
  "event-service:8003"
  "transaction-service:8004"
  "admin-service:8005"
  "upload-service:8006"
)

# Install dependencies for all services first
print_info "Step 1: Installing dependencies for all services..."
echo ""

for service_config in "${SERVICES[@]}"; do
  service="${service_config%%:*}"
  
  if [ -d "$service" ]; then
    print_info "Installing dependencies for $service..."
    cd "$service"
    
    # Create symlink if needed
    if [ ! -L "shared" ] && [ ! -d "shared" ]; then
      ln -sf ../shared shared
    fi
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
      npm install --silent
      print_success "$service dependencies installed"
    else
      print_success "$service dependencies already installed"
    fi
    
    cd ..
  fi
done

echo ""
print_info "=========================================="
print_info "Step 2: Starting all services..."
print_info "=========================================="
echo ""

# Create logs directory
mkdir -p logs

# Start each service in the background
for service_config in "${SERVICES[@]}"; do
  service="${service_config%%:*}"
  port="${service_config##*:}"
  
  if [ -d "$service" ]; then
    print_info "Starting $service on port $port..."
    
    # Kill any existing process on this port
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
      lsof -ti:$port | xargs kill -9 2>/dev/null || true
      sleep 1
    fi
    
    # Start service in background
    cd "$service"
    PORT=$port NODE_ENV=development nohup npx tsx src/index.ts > ../logs/$service.log 2>&1 &
    SERVICE_PID=$!
    echo $SERVICE_PID > ../logs/$service.pid
    cd ..
    
    print_success "$service started (PID: $SERVICE_PID)"
    
    # Small delay between service starts
    sleep 2
  fi
done

echo ""
print_success "=========================================="
print_success "All services started!"
print_success "=========================================="
echo ""

# Display running services
print_info "Running services:"
for service_config in "${SERVICES[@]}"; do
  service="${service_config%%:*}"
  port="${service_config##*:}"
  
  if [ -f "logs/$service.pid" ]; then
    pid=$(cat logs/$service.pid)
    if ps -p $pid > /dev/null 2>&1; then
      echo "  ✓ $service - http://localhost:$port (PID: $pid)"
    else
      echo "  ✗ $service - FAILED TO START (check logs/$service.log)"
    fi
  fi
done

echo ""
print_info "Logs location: ./logs/"
print_info "To view logs: tail -f logs/<service-name>.log"
print_info "To stop all services: ./stop-all-services.sh"
echo ""

