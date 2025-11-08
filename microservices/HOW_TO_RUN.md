# How to Run Microservices

This guide explains how to run any of the microservices independently.

## Prerequisites

1. **Node.js 20+** installed
2. **Dependencies installed** in the service directory
3. **Environment variables** configured (or use inline env vars)
4. **Database** running (PostgreSQL) - optional for some services
5. **Symlink to shared directory** created (if not already done)

## Quick Start

### Option 1: Run with tsx (Recommended for Development)

```bash
# Navigate to the service directory
cd microservices/auth-service  # or user-service, event-service, etc.

# Install dependencies (first time only)
npm install

# Create symlink to shared directory (if not exists)
ln -sf ../shared shared

# Run with environment variables
NODE_ENV=development \
PORT=3001 \
CLIENT_URL=http://localhost:3000 \
JWT_SECRET=your-secret-key-min-32-chars-long \
EMAIL_USER=your-email@example.com \
EMAIL_PASS=your-password \
DATABASE_URL=postgresql://user:password@localhost:5432/dbname \
npx tsx src/index.ts
```

### Option 2: Run with npm scripts (After building)

```bash
cd microservices/auth-service

# Build TypeScript
npm run build

# Run compiled JavaScript
PORT=3001 DATABASE_URL=postgresql://... npm start
```

### Option 3: Use .env file

```bash
cd microservices/auth-service

# Create .env file or copy from parent directory
cp ../../.env .env

# Edit .env with correct values, then:
npx tsx src/index.ts
```

## Service Ports

Each service runs on a different port:

- **auth-service**: 3001
- **user-service**: 3002
- **event-service**: 3003
- **transaction-service**: 3004
- **admin-service**: 3005
- **upload-service**: 3006

## Running Specific Services

### Auth Service
```bash
cd microservices/auth-service
npm install
ln -sf ../shared shared
PORT=3001 npx tsx src/index.ts
```

### User Service
```bash
cd microservices/user-service
npm install
ln -sf ../shared shared
PORT=3002 npx tsx src/index.ts
```

### Event Service
```bash
cd microservices/event-service
npm install
ln -sf ../shared shared
PORT=3003 npx tsx src/index.ts
```

### Transaction Service
```bash
cd microservices/transaction-service
npm install
ln -sf ../shared shared
PORT=3004 npx tsx src/index.ts
```

### Admin Service
```bash
cd microservices/admin-service
npm install
ln -sf ../shared shared
PORT=3005 npx tsx src/index.ts
```

### Upload Service
```bash
cd microservices/upload-service
npm install
ln -sf ../shared shared
PORT=3006 npx tsx src/index.ts
```

## Required Environment Variables

All services need these environment variables:

```bash
# Required
NODE_ENV=development
PORT=3001  # Change per service
JWT_SECRET=your-secret-key-minimum-32-characters-long
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Optional but recommended
CLIENT_URL=http://localhost:3000
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
REDIS_URL=redis://localhost:6379

# For upload-service and services using file uploads
R2_BUCKET=your-bucket-name
R2_ENDPOINT=https://your-endpoint.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_PUBLIC_URL=https://your-public-url.com

# For transaction-service and event-service
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

## Health Check

After starting a service, verify it's running:

```bash
# Check health endpoint
curl http://localhost:3001/health  # Change port for different services

# Expected response:
# {"success":true,"status":{"code":200},"data":{"status":"ok","service":"auth-service"}}
```

## Running Multiple Services

To run multiple services simultaneously, use separate terminal windows or run in background:

```bash
# Terminal 1 - Auth Service
cd microservices/auth-service && PORT=3001 npx tsx src/index.ts &

# Terminal 2 - User Service  
cd microservices/user-service && PORT=3002 npx tsx src/index.ts &

# Terminal 3 - Event Service
cd microservices/event-service && PORT=3003 npx tsx src/index.ts &
```

## Using Docker Compose (All Services)

To run all services together with Docker:

```bash
cd microservices
docker-compose up -d
```

This starts all services, PostgreSQL, and Redis.

## Troubleshooting

### Module not found errors
```bash
# Ensure symlink exists
cd microservices/[service-name]
ln -sf ../shared shared
ls -la shared  # Should show symlink
```

### Port already in use
```bash
# Find process using port
lsof -i :3001
# Kill process
kill -9 <PID>
```

### Database connection errors
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists

### Prisma client errors
```bash
# Generate Prisma client
cd microservices/[service-name]
npx prisma generate --schema=../../prisma/schema.prisma
```

## Development vs Production

**Development** (using tsx):
```bash
npx tsx src/index.ts
```

**Production** (after build):
```bash
npm run build
npm start
```

## Quick Test Script

Create a test script `run-service.sh`:

```bash
#!/bin/bash
SERVICE=$1
PORT=$2

if [ -z "$SERVICE" ] || [ -z "$PORT" ]; then
  echo "Usage: ./run-service.sh <service-name> <port>"
  echo "Example: ./run-service.sh auth-service 3001"
  exit 1
fi

cd microservices/$SERVICE
npm install
ln -sf ../shared shared
PORT=$PORT npx tsx src/index.ts
```

Usage:
```bash
chmod +x run-service.sh
./run-service.sh auth-service 3001
```

