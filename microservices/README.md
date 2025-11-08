# Microservices Architecture

This directory contains the microservices implementation of the backend application.

## Architecture Overview

The application has been split into the following microservices:

1. **auth-service** (Port 3001) - User authentication, registration, login, password management
2. **user-service** (Port 3002) - User profile management, user events, organized events
3. **event-service** (Port 3003) - Event CRUD operations, event registration, attendees management
4. **transaction-service** (Port 3004) - Payment processing, transaction history
5. **admin-service** (Port 3005) - Admin authentication and management
6. **upload-service** (Port 3006) - File uploads (images, videos)

**Note:** Frontend applications should call each service directly at their respective endpoints.

## Shared Resources

All microservices share common utilities and configurations located in the `shared/` directory:
- `shared/config/` - Database, environment, Razorpay configurations
- `shared/constants/` - Error codes, status codes
- `shared/types/` - TypeScript type definitions
- `shared/utils/` - Common functions, response handlers, cache utilities

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL database
- Redis (for caching)

## Setup

1. Copy the `.env` file from the parent directory to the microservices directory
2. Ensure all environment variables are set correctly
3. Run database migrations:
   ```bash
   cd ../prisma
   npx prisma migrate deploy
   ```

## Running with Docker Compose

```bash
docker-compose up -d
```

This will start all services including:
- PostgreSQL database
- Redis cache
- All 6 microservices

## Running Individual Services Locally

Each service can be run independently:

```bash
cd auth-service
npm install
npm run dev
```

## API Endpoints

Each service exposes its own REST API endpoints:

- **auth-service**: `/api/v1/auth/users/*`
- **user-service**: `/api/v1/users/*`
- **event-service**: `/api/v1/events/*`
- **transaction-service**: `/api/v1/transactions/*`
- **admin-service**: `/api/v1/auth/admins/*`
- **upload-service**: `/api/v1/upload/*`

Frontend applications should call each service directly at its respective URL.

## Health Checks

Each service exposes a `/health` endpoint:
- `http://localhost:3001/health` - auth-service
- `http://localhost:3002/health` - user-service
- `http://localhost:3003/health` - event-service
- `http://localhost:3004/health` - transaction-service
- `http://localhost:3005/health` - admin-service
- `http://localhost:3006/health` - upload-service

## Notes

- The monolithic code remains unchanged in the parent directory
- All microservices use the same database (shared PostgreSQL instance)
- Services communicate via HTTP/REST
- Authentication tokens are shared across services via cookies/headers

