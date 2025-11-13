# Microservices Architecture with RabbitMQ

This is a rebuilt microservices architecture with separate databases for each service and RabbitMQ for inter-service communication.

## Architecture Overview

```
Client → API Gateway (Port 8000) → RabbitMQ → Services
                                      ↓
                            ┌─────────┴─────────┐
                            ↓                   ↓
                    Auth Service         User Service
                    (Auth DB)            (User DB)
```

## Services

### 1. API Gateway (`api-gateway/`)
- **Port**: 8000
- **Purpose**: Single entry point for all client requests
- **Communication**: Uses RabbitMQ to communicate with backend services
- **Routes**:
  - `/api/v1/auth/*` - Authentication routes
  - `/api/v1/users/*` - User profile routes

### 2. Auth Service (`auth-service/`)
- **Database**: Separate PostgreSQL database (`AUTH_DATABASE_URL`)
- **Purpose**: Handles authentication-related operations
- **Models**: User (basic), Account, Otp
- **Actions**:
  - register, login, logout
  - getMe, changePassword
  - forgotPassword, verifyOTP, changeForgotPassword

### 3. User Service (`user-service/`)
- **Database**: Separate PostgreSQL database (`USER_DATABASE_URL`)
- **Purpose**: Handles user profile-related operations
- **Models**: User (profile fields only)
- **Actions**:
  - getProfile, updateProfile
  - updateProfileImage
  - getUserEvents, getOrganizedEvents

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **RabbitMQ** (v3.12 or higher)

## Setup Instructions

### 1. Install RabbitMQ

**On Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server
```

**On macOS:**
```bash
brew install rabbitmq
brew services start rabbitmq
```

**Using Docker:**
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 2. Create Databases

```sql
-- Create auth database
CREATE DATABASE auth_db;

-- Create user database
CREATE DATABASE user_db;
```

### 3. Environment Configuration

Copy the `.env.example` file and configure it:

```bash
cd services
cp .env.example .env
```

Edit `.env` with your actual values:
- Database URLs
- JWT Secret
- Email credentials
- RabbitMQ URL
- R2 configuration (optional)

### 4. Install Dependencies

```bash
# Install dependencies for each service
cd api-gateway && npm install
cd ../auth-service && npm install
cd ../user-service && npm install
```

### 5. Setup Prisma

```bash
# Auth Service
cd auth-service
npx prisma generate
npx prisma migrate dev --name init

# User Service
cd ../user-service
npx prisma generate
npx prisma migrate dev --name init
```

### 6. Start Services

**Option 1: Start individually**

```bash
# Terminal 1 - API Gateway
cd api-gateway
npm run dev

# Terminal 2 - Auth Service
cd auth-service
npm run dev

# Terminal 3 - User Service
cd user-service
npm run dev
```

**Option 2: Using a script (create `start-all.sh`)**

```bash
#!/bin/bash
cd api-gateway && npm run dev &
cd ../auth-service && npm run dev &
cd ../user-service && npm run dev &
wait
```

## API Endpoints

### Authentication Routes (`/api/v1/auth`)

- `POST /register` - Register a new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get authenticated user details
- `POST /change-password` - Change password
- `POST /forgot-password` - Request password reset OTP
- `POST /verify-otp` - Verify OTP
- `POST /change-forgot-password` - Reset password with OTP

### User Routes (`/api/v1/users`)

- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PUT /profile-image` - Update profile image
- `POST /change-password` - Change password (redirects to auth-service)
- `GET /events` - Get user registered events
- `GET /organized-events` - Get organized events

## Database Schemas

### Auth Service Database
- **User**: Basic user info (id, email, username, passwordHash, role, gender)
- **Account**: OAuth accounts
- **Otp**: Password reset OTPs

### User Service Database
- **User**: Profile information (all user fields except passwordHash)

## Message Queue Flow

1. Client sends HTTP request to API Gateway
2. API Gateway publishes message to appropriate service queue (auth-service-queue or user-service-queue)
3. Service consumes message, processes request
4. Service publishes response to response queue (api-gateway-response-queue)
5. API Gateway consumes response and sends HTTP response to client

## Development

### Running in Development Mode

All services support `npm run dev` which uses `tsx watch` for hot reloading.

### Database Migrations

```bash
# Auth Service
cd auth-service
npx prisma migrate dev

# User Service
cd user-service
npx prisma migrate dev
```

### Viewing Database

```bash
# Auth Service
cd auth-service
npx prisma studio

# User Service
cd user-service
npx prisma studio
```

## Troubleshooting

### RabbitMQ Connection Issues

- Ensure RabbitMQ is running: `sudo systemctl status rabbitmq-server`
- Check RabbitMQ logs: `sudo journalctl -u rabbitmq-server`
- Verify connection: `rabbitmqctl status`

### Database Connection Issues

- Verify database URLs in `.env`
- Ensure databases exist
- Check PostgreSQL is running: `sudo systemctl status postgresql`

### Service Not Responding

- Check service logs
- Verify RabbitMQ queues are created
- Ensure all environment variables are set correctly

## Notes

- Each service has its own database for data isolation
- Services communicate only through RabbitMQ (no direct HTTP calls)
- API Gateway is the single entry point for all client requests
- JWT tokens are validated in the API Gateway (lightweight check) and fully validated in auth-service

