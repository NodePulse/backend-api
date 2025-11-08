# Frontend Integration Guide

## Architecture Change

**API Gateway has been removed** from this project. Your frontend now needs to call each microservice directly.

## Service URLs (Local Development)

When running locally with `docker-compose up`:

```javascript
const API_URLS = {
  AUTH: "http://localhost:3001/api/v1",
  USER: "http://localhost:3002/api/v1",
  EVENT: "http://localhost:3003/api/v1",
  TRANSACTION: "http://localhost:3004/api/v1",
  ADMIN: "http://localhost:3005/api/v1",
  UPLOAD: "http://localhost:3006/api/v1"
}
```

## Service URLs (Production - Render)

After deploying to Render, your service URLs will be:

```javascript
const API_URLS = {
  AUTH: "https://auth-service.onrender.com/api/v1",
  USER: "https://user-service.onrender.com/api/v1",
  EVENT: "https://event-service.onrender.com/api/v1",
  TRANSACTION: "https://transaction-service.onrender.com/api/v1",
  ADMIN: "https://admin-service.onrender.com/api/v1",
  UPLOAD: "https://upload-service.onrender.com/api/v1"
}
```

**Note:** Replace with your actual Render service URLs after deployment.

## Frontend Code Examples

### React/Next.js Example

```javascript
// config/api.js
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_URLS = {
  AUTH: isDevelopment 
    ? "http://localhost:3001/api/v1" 
    : "https://auth-service.onrender.com/api/v1",
  USER: isDevelopment 
    ? "http://localhost:3002/api/v1" 
    : "https://user-service.onrender.com/api/v1",
  EVENT: isDevelopment 
    ? "http://localhost:3003/api/v1" 
    : "https://event-service.onrender.com/api/v1",
  TRANSACTION: isDevelopment 
    ? "http://localhost:3004/api/v1" 
    : "https://transaction-service.onrender.com/api/v1",
  ADMIN: isDevelopment 
    ? "http://localhost:3005/api/v1" 
    : "https://admin-service.onrender.com/api/v1",
  UPLOAD: isDevelopment 
    ? "http://localhost:3006/api/v1" 
    : "https://upload-service.onrender.com/api/v1"
};

// services/auth.service.js
import { API_URLS } from '../config/api';

export const login = async (email, password) => {
  const response = await fetch(`${API_URLS.AUTH}/auth/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// services/event.service.js
import { API_URLS } from '../config/api';

export const getEvents = async () => {
  const response = await fetch(`${API_URLS.EVENT}/events`, {
    credentials: 'include'
  });
  return response.json();
};

// services/user.service.js
import { API_URLS } from '../config/api';

export const getUserProfile = async () => {
  const response = await fetch(`${API_URLS.USER}/users/profile`, {
    credentials: 'include'
  });
  return response.json();
};
```

### Axios Example

```javascript
// config/axios.js
import axios from 'axios';

const isDevelopment = process.env.NODE_ENV === 'development';

const baseURLs = {
  auth: isDevelopment ? 'http://localhost:3001/api/v1' : 'https://auth-service.onrender.com/api/v1',
  user: isDevelopment ? 'http://localhost:3002/api/v1' : 'https://user-service.onrender.com/api/v1',
  event: isDevelopment ? 'http://localhost:3003/api/v1' : 'https://event-service.onrender.com/api/v1',
  transaction: isDevelopment ? 'http://localhost:3004/api/v1' : 'https://transaction-service.onrender.com/api/v1',
  admin: isDevelopment ? 'http://localhost:3005/api/v1' : 'https://admin-service.onrender.com/api/v1',
  upload: isDevelopment ? 'http://localhost:3006/api/v1' : 'https://upload-service.onrender.com/api/v1',
};

// Create axios instances for each service
export const authAPI = axios.create({
  baseURL: baseURLs.auth,
  withCredentials: true
});

export const userAPI = axios.create({
  baseURL: baseURLs.user,
  withCredentials: true
});

export const eventAPI = axios.create({
  baseURL: baseURLs.event,
  withCredentials: true
});

export const transactionAPI = axios.create({
  baseURL: baseURLs.transaction,
  withCredentials: true
});

export const adminAPI = axios.create({
  baseURL: baseURLs.admin,
  withCredentials: true
});

export const uploadAPI = axios.create({
  baseURL: baseURLs.upload,
  withCredentials: true
});

// Usage:
import { authAPI, eventAPI } from './config/axios';

// Login
const login = (email, password) => {
  return authAPI.post('/auth/users/login', { email, password });
};

// Get events
const getEvents = () => {
  return eventAPI.get('/events');
};
```

## API Endpoints by Service

### Auth Service (Port 3001)
- `POST /api/v1/auth/users/register` - Register user
- `POST /api/v1/auth/users/login` - Login user
- `POST /api/v1/auth/users/logout` - Logout user
- `POST /api/v1/auth/users/forgot-password` - Forgot password
- `POST /api/v1/auth/users/reset-password` - Reset password
- `POST /api/v1/auth/users/verify-otp` - Verify OTP

### User Service (Port 3002)
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `GET /api/v1/users/:userId/events` - Get user's registered events
- `GET /api/v1/users/:userId/organized` - Get user's organized events

### Event Service (Port 3003)
- `GET /api/v1/events` - Get all events
- `GET /api/v1/events/:id` - Get single event
- `POST /api/v1/events` - Create event
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event
- `POST /api/v1/events/:id/register` - Register for event
- `GET /api/v1/events/:id/attendees` - Get event attendees

### Transaction Service (Port 3004)
- `POST /api/v1/transactions/create-order` - Create Razorpay order
- `POST /api/v1/transactions/verify-payment` - Verify payment
- `GET /api/v1/transactions/history` - Get transaction history

### Admin Service (Port 3005)
- `POST /api/v1/auth/admins/login` - Admin login
- `GET /api/v1/auth/admins/dashboard` - Admin dashboard stats
- `GET /api/v1/auth/admins/users` - Get all users
- `DELETE /api/v1/auth/admins/users/:id` - Delete user

### Upload Service (Port 3006)
- `POST /api/v1/upload/image` - Upload image
- `POST /api/v1/upload/video` - Upload video

## CORS Configuration

All services are configured to accept requests from your frontend URL. Make sure to:

1. Update `CLIENT_URL` in each service's environment variables
2. Ensure cookies work cross-origin (use `credentials: 'include'` or `withCredentials: true`)

## Running Locally

```bash
# Start all microservices
cd /path/to/backend/microservices
docker-compose up -d

# Your frontend can now call:
# - http://localhost:3001/api/v1 (auth)
# - http://localhost:3002/api/v1 (user)
# - http://localhost:3003/api/v1 (event)
# - http://localhost:3004/api/v1 (transaction)
# - http://localhost:3005/api/v1 (admin)
# - http://localhost:3006/api/v1 (upload)
```

## Deployment Notes

### Cost on Render
- **6 services** × $7/month = $42/month
- **1 database** = $7/month
- **Total: $49/month**

### Environment Variables
After deploying to Render, update your frontend's environment variables with the actual service URLs:

```env
# .env.production
NEXT_PUBLIC_AUTH_URL=https://auth-service-xyz.onrender.com/api/v1
NEXT_PUBLIC_USER_URL=https://user-service-xyz.onrender.com/api/v1
NEXT_PUBLIC_EVENT_URL=https://event-service-xyz.onrender.com/api/v1
NEXT_PUBLIC_TRANSACTION_URL=https://transaction-service-xyz.onrender.com/api/v1
NEXT_PUBLIC_ADMIN_URL=https://admin-service-xyz.onrender.com/api/v1
NEXT_PUBLIC_UPLOAD_URL=https://upload-service-xyz.onrender.com/api/v1
```

## Troubleshooting

### CORS Errors
If you get CORS errors:
1. Check that `CLIENT_URL` is set correctly in each service
2. Ensure you're using `credentials: 'include'` or `withCredentials: true`
3. Verify your frontend URL matches the `CLIENT_URL` in backend

### Authentication Not Working
- Make sure cookies are being sent with requests
- Check that `credentials: 'include'` is set on all authenticated requests
- Verify HTTPS is used in production (cookies won't work over HTTP)

### Service Unavailable
- Check that all services are running: `docker-compose ps`
- View logs: `docker-compose logs -f [service-name]`
- Test health endpoints: `curl http://localhost:3001/health`

