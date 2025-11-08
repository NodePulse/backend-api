#!/bin/bash

# Script to stop all running microservices
# Usage: ./stop-all-services.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

echo ""
print_info "=========================================="
print_info "Stopping All Microservices"
print_info "=========================================="
echo ""

# Check if logs directory exists
if [ ! -d "logs" ]; then
  print_info "No services running (logs directory not found)"
  exit 0
fi

# Array of services
declare -a SERVICES=(
  "auth-service"
  "user-service"
  "event-service"
  "transaction-service"
  "admin-service"
  "upload-service"
)

STOPPED_COUNT=0

# Stop each service
for service in "${SERVICES[@]}"; do
  if [ -f "logs/$service.pid" ]; then
    pid=$(cat "logs/$service.pid")
    
    if ps -p $pid > /dev/null 2>&1; then
      print_info "Stopping $service (PID: $pid)..."
      kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
      sleep 1
      
      if ! ps -p $pid > /dev/null 2>&1; then
        print_success "$service stopped"
        rm "logs/$service.pid"
        ((STOPPED_COUNT++))
      else
        print_error "Failed to stop $service"
      fi
    else
      print_info "$service was not running (stale PID file)"
      rm "logs/$service.pid"
    fi
  fi
done

echo ""
if [ $STOPPED_COUNT -gt 0 ]; then
  print_success "Stopped $STOPPED_COUNT service(s)"
else
  print_info "No services were running"
fi

# Clean up old log files (optional)
if [ -d "logs" ] && [ -z "$(ls -A logs/*.pid 2>/dev/null)" ]; then
  print_info "All services stopped. Log files preserved in ./logs/"
fi

echo ""

