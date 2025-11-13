#!/bin/bash

# Script to run a microservice locally
# Usage: ./run-service.sh <service-name> [port]
# Example: ./run-service.sh auth-service 3001

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME=$1
PORT=$2

# Service configurations
declare -A SERVICE_PORTS=(
  ["auth-service"]="8001"
  ["user-service"]="8002"
  ["event-service"]="8003"
  ["transaction-service"]="8004"
  ["admin-service"]="8005"
  ["upload-service"]="8006"
)

# Function to print colored output
print_info() {
  echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Function to display usage
show_usage() {
  echo ""
  echo "Usage: $0 <service-name> [port]"
  echo ""
  echo "Available services:"
  echo "  - auth-service      (default port: 8001)"
  echo "  - user-service      (default port: 8002)"
  echo "  - event-service     (default port: 8003)"
  echo "  - transaction-service (default port: 8004)"
  echo "  - admin-service     (default port: 8005)"
  echo "  - upload-service    (default port: 8006)"
  echo ""
  echo "Examples:"
  echo "  $0 auth-service"
  echo "  $0 auth-service 8001"
  echo "  $0 user-service 9000"
  echo ""
  exit 1
}

# Check if service name is provided
if [ -z "$SERVICE_NAME" ]; then
  print_error "Service name is required!"
  show_usage
fi

# Check if service exists
if [ ! -d "$SERVICE_NAME" ]; then
  print_error "Service '$SERVICE_NAME' not found!"
  print_info "Make sure you're in the microservices directory"
  show_usage
fi

# Get default port or use provided port
if [ -z "$PORT" ]; then
  PORT=${SERVICE_PORTS[$SERVICE_NAME]}
  if [ -z "$PORT" ]; then
    print_error "Unknown service '$SERVICE_NAME'"
    show_usage
  fi
fi

print_info "=========================================="
print_info "Starting: $SERVICE_NAME"
print_info "Port: $PORT"
print_info "=========================================="
echo ""

# Navigate to service directory
cd "$SERVICE_NAME" || exit 1

# Check if package.json exists
if [ ! -f "package.json" ]; then
  print_error "package.json not found in $SERVICE_NAME"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  print_warning "node_modules not found. Installing dependencies..."
  npm install
  print_success "Dependencies installed"
else
  print_info "Dependencies already installed (skipping npm install)"
fi

# Create or verify symlink to shared directory
if [ ! -L "shared" ] && [ ! -d "shared" ]; then
  print_info "Creating symlink to shared directory..."
  ln -sf ../shared shared
  print_success "Symlink created"
elif [ -L "shared" ]; then
  print_success "Shared directory symlink exists"
else
  print_warning "Shared directory exists (not a symlink)"
fi

# Check for .env file (service-specific first, then parent directory)
if [ -f ".env" ]; then
  print_success ".env file found in service directory ($SERVICE_NAME/.env)"
  # Load environment variables from service-specific .env
  set -a
  source .env
  set +a
elif [ -f "../.env" ]; then
  print_success ".env file found in parent directory"
  # Load environment variables from parent .env
  set -a
  source ../.env
  set +a
else
  print_warning "No .env file found (checked $SERVICE_NAME/.env and ../.env)"
  print_info "The service may fail if environment variables are not set"
fi

# Kill any process using the port
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  print_warning "Port $PORT is already in use. Attempting to kill the process..."
  lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
  sleep 1
  print_success "Port $PORT is now free"
fi

echo ""
print_success "Starting $SERVICE_NAME on port $PORT..."
print_info "Press Ctrl+C to stop"
echo ""
print_info "=========================================="
echo ""

# Set environment variables and run the service
export PORT=$PORT
export NODE_ENV=${NODE_ENV:-development}

# Load .env variables if file exists (service-specific first, then parent)
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
elif [ -f "../.env" ]; then
  set -a
  source ../.env
  set +a
fi

# Check if tsx is available, otherwise use ts-node or npm run dev
if command -v npx &> /dev/null && npx tsx --version &> /dev/null 2>&1; then
  npx tsx src/index.ts
elif [ -f "package.json" ] && grep -q "\"dev\":" package.json; then
  npm run dev
else
  print_error "Cannot find a way to run the service"
  print_info "Please install tsx: npm install -g tsx"
  exit 1
fi

