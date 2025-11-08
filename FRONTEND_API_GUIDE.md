# Backend API Integration Guide for Frontend

## Overview
This document provides complete API documentation for integrating with the microservices backend. All services use a consistent response format and authentication mechanism.

---

## Base URLs (Development)
```
Auth Service:        http://localhost:8081
User Service:        http://localhost:8082
Event Service:       http://localhost:8083
Transaction Service: http://localhost:8084
Admin Service:       http://localhost:8085
Upload Service:      http://localhost:8086
```

---

## Common Response Format

All API responses follow this structure:

### Success Response
```json
{
  "error": false,
  "status": 200,
  "timestamp": "2025-11-06T18:39:18.640Z",
  "message": "Success message here",
  "data": "ENCRYPTED_STRING_OR_OBJECT",
  "meta": {},
  "requestId": "uuid-v4"
}
```

### Error Response
```json
{
  "error": true,
  "status": 400,
  "timestamp": "2025-11-06T18:39:18.640Z",
  "message": "Error message here",
  "data": null,
  "validationErrors": [
    {
      "field": "email",
      "issue": "Invalid email address"
    }
  ],
  "errorCode": "INVALID_INPUT",
  "requestId": "uuid-v4"
}
```

---

## 🔒 Authentication

### Cookie-Based Authentication
All authenticated endpoints require a JWT token stored in an HTTP-only cookie named `token`.

**Cookie Details:**
- Name: `token`
- HttpOnly: true
- Secure: true (production only)
- SameSite: "none" (production) / "lax" (development)
- Max Age: 24 hours

**Important:** The cookie is automatically set/cleared by the backend on login/logout. Frontend should include credentials in requests.

---

## 🔐 Response Encryption

**Auth Service Only:** Response data is encrypted using AES encryption (CryptoJS format).

### Decryption (Frontend)
```javascript
import CryptoJS from 'crypto-js';

function decryptResponse(encryptedData, secret = 'YOUR_JWT_SECRET') {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, secret);
  const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
  return JSON.parse(jsonString);
}

// Usage
const response = await fetch('/api/v1/auth/users/me');
const result = await response.json();

if (result.data && typeof result.data === 'string') {
  const decryptedData = decryptResponse(result.data);
  console.log(decryptedData);
}
```

---

## 📚 API Endpoints by Service

---

## 1️⃣ AUTH SERVICE (Port 3001)

Base Path: `/api/v1/auth/users`

### 1.1 Register User
**POST** `/api/v1/auth/users/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe123",
  "password": "Password123!",
  "gender": "Male"
}
```

**Validation Rules:**
- Email: Valid email format
- Username: 3-50 chars, alphanumeric + underscore only
- Password: 8-20 chars, at least one uppercase, one lowercase, one digit
- Gender: "Male" | "Female" | "Other"

**Response (201):**
```json
{
  "error": false,
  "status": 201,
  "message": "Registration successful",
  "data": "ENCRYPTED{id, email, username, gender, role, image, createdAt, updatedAt, token}"
}
```

**Frontend Usage:**
```javascript
async function register(userData) {
  const response = await fetch('http://localhost:3001/api/v1/auth/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important for cookies
    body: JSON.stringify(userData)
  });
  
  const result = await response.json();
  
  if (!result.error) {
    const user = decryptResponse(result.data);
    // Store token or user info if needed
    return user;
  } else {
    throw new Error(result.message);
  }
}
```

---

### 1.2 Login User
**POST** `/api/v1/auth/users/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Login successful",
  "data": "ENCRYPTED{id, email, username, name, gender, image, role, createdAt, updatedAt, token}"
}
```

**Frontend Usage:**
```javascript
async function login(email, password) {
  const response = await fetch('http://localhost:3001/api/v1/auth/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  
  const result = await response.json();
  
  if (!result.error) {
    const user = decryptResponse(result.data);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } else {
    throw new Error(result.message);
  }
}
```

---

### 1.3 Logout User
**POST** `/api/v1/auth/users/logout`

**Authentication:** Required

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Logout successful",
  "data": null
}
```

**Frontend Usage:**
```javascript
async function logout() {
  const response = await fetch('http://localhost:3001/api/v1/auth/users/logout', {
    method: 'POST',
    credentials: 'include'
  });
  
  const result = await response.json();
  
  if (!result.error) {
    localStorage.removeItem('user');
    // Redirect to login page
  }
}
```

---

### 1.4 Get Current User
**GET** `/api/v1/auth/users/me`

**Authentication:** Required

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "User profile retrieved successfully",
  "data": "ENCRYPTED{id, email, username, name, gender, image, role, createdAt, updatedAt}"
}
```

**Frontend Usage:**
```javascript
async function getCurrentUser() {
  const response = await fetch('http://localhost:3001/api/v1/auth/users/me', {
    method: 'GET',
    credentials: 'include'
  });
  
  const result = await response.json();
  
  if (!result.error) {
    return decryptResponse(result.data);
  }
  return null;
}
```

---

### 1.5 Change Password
**POST** `/api/v1/auth/users/change-password`

**Authentication:** Required

**Request Body:**
```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Password changed successfully",
  "data": null
}
```

**Frontend Usage:**
```javascript
async function changePassword(oldPassword, newPassword, confirmPassword) {
  const response = await fetch('http://localhost:3001/api/v1/auth/users/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
  });
  
  const result = await response.json();
  return result;
}
```

---

### 1.6 Forgot Password (Send OTP)
**POST** `/api/v1/auth/users/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Password reset OTP sent successfully",
  "data": null
}
```

**Frontend Usage:**
```javascript
async function forgotPassword(email) {
  const response = await fetch('http://localhost:3001/api/v1/auth/users/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const result = await response.json();
  return result;
}
```

---

### 1.7 Verify OTP
**POST** `/api/v1/auth/users/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "OTP verified successfully",
  "data": null
}
```

---

### 1.8 Reset Password (with OTP)
**POST** `/api/v1/auth/users/change-forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Password reset successful",
  "data": null
}
```

---

## 2️⃣ USER SERVICE (Port 3002)

Base Path: `/api/v1/users`

### 2.1 Get All Users
**GET** `/api/v1/users`

**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name, email, username
- `status` (optional): Filter by status ("active", "inactive", "suspended")
- `kycStatus` (optional): Filter by KYC status

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "username": "johndoe",
        "name": "John Doe",
        "status": "active",
        "kyc_status": "approved",
        "createdAt": "2025-11-06T10:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

**Frontend Usage:**
```javascript
async function getUsers(page = 1, limit = 10, search = '') {
  const params = new URLSearchParams({ page, limit, search });
  const response = await fetch(`http://localhost:3002/api/v1/users?${params}`, {
    credentials: 'include'
  });
  
  const result = await response.json();
  return result.data;
}
```

---

### 2.2 Get User by ID
**GET** `/api/v1/users/:id`

**Authentication:** Required

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "User fetched successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "name": "John Doe",
    "image": "https://...",
    "status": "active",
    "kyc_status": "approved"
  }
}
```

---

### 2.3 Update User Profile
**PUT** `/api/v1/users/:id`

**Authentication:** Required

**Content-Type:** `multipart/form-data` (for image upload)

**Form Data:**
```javascript
{
  name: "John Doe",
  username: "johndoe",
  image: File // Optional image file
}
```

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "User updated successfully",
  "data": { /* updated user object */ }
}
```

**Frontend Usage:**
```javascript
async function updateProfile(userId, userData, imageFile) {
  const formData = new FormData();
  formData.append('name', userData.name);
  formData.append('username', userData.username);
  
  if (imageFile) {
    formData.append('image', imageFile);
  }
  
  const response = await fetch(`http://localhost:3002/api/v1/users/${userId}`, {
    method: 'PUT',
    credentials: 'include',
    body: formData
  });
  
  const result = await response.json();
  return result;
}
```

---

### 2.4 Delete User
**DELETE** `/api/v1/users/:id`

**Authentication:** Required

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "User deleted successfully",
  "data": null
}
```

---

## 3️⃣ EVENT SERVICE (Port 3003)

Base Path: `/api/v1/events`

### 3.1 Get All Events
**GET** `/api/v1/events`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by title
- `status` (optional): Filter by status
- `category` (optional): Filter by category

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Events fetched successfully",
  "data": {
    "data": [
      {
        "id": "uuid",
        "title": "Event Title",
        "description": "Event description",
        "image": "https://...",
        "video": "https://...",
        "startDate": "2025-12-01T10:00:00.000Z",
        "endDate": "2025-12-01T18:00:00.000Z",
        "location": "Event venue",
        "status": "upcoming",
        "category": "conference"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

**Frontend Usage:**
```javascript
async function getEvents(page = 1, limit = 10, filters = {}) {
  const params = new URLSearchParams({ page, limit, ...filters });
  const response = await fetch(`http://localhost:3003/api/v1/events?${params}`);
  
  const result = await response.json();
  return result.data;
}
```

---

### 3.2 Get Event by ID
**GET** `/api/v1/events/:id`

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Event fetched successfully",
  "data": {
    "id": "uuid",
    "title": "Event Title",
    "description": "Full description...",
    "image": "https://...",
    "video": "https://...",
    "startDate": "2025-12-01T10:00:00.000Z",
    "endDate": "2025-12-01T18:00:00.000Z",
    "location": "Event venue",
    "price": 50.00,
    "capacity": 100,
    "registered": 45
  }
}
```

---

### 3.3 Create Event
**POST** `/api/v1/events`

**Authentication:** Required (Admin/Organizer)

**Content-Type:** `multipart/form-data`

**Form Data:**
```javascript
{
  title: "Event Title",
  description: "Description",
  startDate: "2025-12-01T10:00:00.000Z",
  endDate: "2025-12-01T18:00:00.000Z",
  location: "Venue",
  price: 50,
  capacity: 100,
  category: "conference",
  image: File,
  video: File // Optional
}
```

**Frontend Usage:**
```javascript
async function createEvent(eventData, imageFile, videoFile) {
  const formData = new FormData();
  
  Object.keys(eventData).forEach(key => {
    formData.append(key, eventData[key]);
  });
  
  formData.append('image', imageFile);
  if (videoFile) {
    formData.append('video', videoFile);
  }
  
  const response = await fetch('http://localhost:3003/api/v1/events', {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  
  const result = await response.json();
  return result;
}
```

---

### 3.4 Update Event
**PUT** `/api/v1/events/:id`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

---

### 3.5 Delete Event
**DELETE** `/api/v1/events/:id`

**Authentication:** Required

---

## 4️⃣ TRANSACTION SERVICE (Port 3004)

Base Path: `/api/v1/transactions`

### 4.1 Get All Transactions
**GET** `/api/v1/transactions`

**Authentication:** Required

**Query Parameters:**
- `page`, `limit`: Pagination
- `type`: Filter by transaction type
- `status`: Filter by status
- `userId`: Filter by user

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "Transactions fetched successfully",
  "data": {
    "data": [
      {
        "id": "uuid",
        "userId": "uuid",
        "type": "payment",
        "amount": 100.00,
        "currency": "USD",
        "status": "completed",
        "createdAt": "2025-11-06T10:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

---

### 4.2 Create Transaction
**POST** `/api/v1/transactions`

**Authentication:** Required

**Request Body:**
```json
{
  "type": "payment",
  "amount": 100.00,
  "currency": "USD",
  "description": "Event ticket purchase",
  "metadata": {
    "eventId": "uuid"
  }
}
```

**Frontend Usage:**
```javascript
async function createTransaction(transactionData) {
  const response = await fetch('http://localhost:3004/api/v1/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(transactionData)
  });
  
  const result = await response.json();
  return result;
}
```

---

## 5️⃣ ADMIN SERVICE (Port 3005)

Base Path: `/api/v1/auth/admins`

### 5.1 Admin Login
**POST** `/api/v1/auth/admins/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "AdminPassword123!"
}
```

### 5.2 Get Dashboard Stats
**GET** `/api/v1/auth/admins/stats`

**Authentication:** Required (Admin only)

---

## 6️⃣ UPLOAD SERVICE (Port 3006)

Base Path: `/api/v1/upload`

### 6.1 Upload File
**POST** `/api/v1/upload`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Data:**
```javascript
{
  file: File,
  folder: "profiles" // or "events", "documents", etc.
}
```

**Response (200):**
```json
{
  "error": false,
  "status": 200,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://cdn.example.com/uploads/file.jpg",
    "key": "uploads/file.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg"
  }
}
```

**Frontend Usage:**
```javascript
async function uploadFile(file, folder = 'uploads') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  
  const response = await fetch('http://localhost:3006/api/v1/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  
  const result = await response.json();
  return result.data.url;
}
```

---

### 6.2 Delete File
**DELETE** `/api/v1/upload`

**Authentication:** Required

**Request Body:**
```json
{
  "url": "https://cdn.example.com/uploads/file.jpg"
}
```

---

## 🔧 Error Codes Reference

| Error Code | Description |
|------------|-------------|
| `INVALID_INPUT` | Validation failed |
| `USER_EXISTS` | User already registered |
| `USERNAME_EXISTS` | Username taken |
| `INVALID_CREDENTIALS` | Wrong email/password |
| `NOT_AUTHENTICATED` | No token or invalid token |
| `UNAUTHORIZED` | Insufficient permissions |
| `USER_NOT_FOUND` | User doesn't exist |
| `INVALID_OLD_PASSWORD` | Wrong old password |
| `OTP_EXPIRED` | OTP has expired |
| `INVALID_OTP` | Wrong OTP |
| `REGISTRATION_ERROR` | Registration failed |
| `LOGIN_ERROR` | Login failed |
| `LOGOUT_ERROR` | Logout failed |

---

## 🎨 Frontend Integration Examples

### React - API Service Layer

```javascript
// src/services/api.js
import axios from 'axios';
import CryptoJS from 'crypto-js';

const API_BASE_URLS = {
  auth: 'http://localhost:3001',
  user: 'http://localhost:3002',
  event: 'http://localhost:3003',
  transaction: 'http://localhost:3004',
  admin: 'http://localhost:3005',
  upload: 'http://localhost:3006'
};

// Create axios instance with default config
const createApiClient = (service) => {
  return axios.create({
    baseURL: API_BASE_URLS[service],
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

// Decrypt response for auth service
const decryptData = (encryptedData, secret = process.env.REACT_APP_ENCRYPTION_KEY) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, secret);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    const client = createApiClient('auth');
    const { data } = await client.post('/api/v1/auth/users/register', userData);
    if (data.data && typeof data.data === 'string') {
      data.data = decryptData(data.data);
    }
    return data;
  },

  login: async (email, password) => {
    const client = createApiClient('auth');
    const { data } = await client.post('/api/v1/auth/users/login', { email, password });
    if (data.data && typeof data.data === 'string') {
      data.data = decryptData(data.data);
    }
    return data;
  },

  logout: async () => {
    const client = createApiClient('auth');
    const { data } = await client.post('/api/v1/auth/users/logout');
    return data;
  },

  getCurrentUser: async () => {
    const client = createApiClient('auth');
    const { data } = await client.get('/api/v1/auth/users/me');
    if (data.data && typeof data.data === 'string') {
      data.data = decryptData(data.data);
    }
    return data;
  },

  changePassword: async (passwords) => {
    const client = createApiClient('auth');
    const { data } = await client.post('/api/v1/auth/users/change-password', passwords);
    return data;
  },

  forgotPassword: async (email) => {
    const client = createApiClient('auth');
    const { data } = await client.post('/api/v1/auth/users/forgot-password', { email });
    return data;
  },

  verifyOTP: async (email, otp) => {
    const client = createApiClient('auth');
    const { data } = await client.post('/api/v1/auth/users/verify-otp', { email, otp });
    return data;
  },

  resetPassword: async (resetData) => {
    const client = createApiClient('auth');
    const { data } = await client.post('/api/v1/auth/users/change-forgot-password', resetData);
    return data;
  }
};

// User API
export const userAPI = {
  getUsers: async (params) => {
    const client = createApiClient('user');
    const { data } = await client.get('/api/v1/users', { params });
    return data;
  },

  getUserById: async (id) => {
    const client = createApiClient('user');
    const { data } = await client.get(`/api/v1/users/${id}`);
    return data;
  },

  updateUser: async (id, formData) => {
    const client = createApiClient('user');
    const { data } = await client.put(`/api/v1/users/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  deleteUser: async (id) => {
    const client = createApiClient('user');
    const { data } = await client.delete(`/api/v1/users/${id}`);
    return data;
  }
};

// Event API
export const eventAPI = {
  getEvents: async (params) => {
    const client = createApiClient('event');
    const { data } = await client.get('/api/v1/events', { params });
    return data;
  },

  getEventById: async (id) => {
    const client = createApiClient('event');
    const { data } = await client.get(`/api/v1/events/${id}`);
    return data;
  },

  createEvent: async (formData) => {
    const client = createApiClient('event');
    const { data } = await client.post('/api/v1/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  updateEvent: async (id, formData) => {
    const client = createApiClient('event');
    const { data } = await client.put(`/api/v1/events/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  deleteEvent: async (id) => {
    const client = createApiClient('event');
    const { data } = await client.delete(`/api/v1/events/${id}`);
    return data;
  }
};

// Transaction API
export const transactionAPI = {
  getTransactions: async (params) => {
    const client = createApiClient('transaction');
    const { data } = await client.get('/api/v1/transactions', { params });
    return data;
  },

  createTransaction: async (transactionData) => {
    const client = createApiClient('transaction');
    const { data } = await client.post('/api/v1/transactions', transactionData);
    return data;
  }
};

// Upload API
export const uploadAPI = {
  uploadFile: async (file, folder = 'uploads') => {
    const client = createApiClient('upload');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const { data } = await client.post('/api/v1/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  deleteFile: async (url) => {
    const client = createApiClient('upload');
    const { data } = await client.delete('/api/v1/upload', { data: { url } });
    return data;
  }
};
```

---

### React - Auth Context Hook

```javascript
// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (!response.error) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    if (!response.error) {
      setUser(response.data);
      return response.data;
    }
    throw new Error(response.message);
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    if (!response.error) {
      setUser(response.data);
      return response.data;
    }
    throw new Error(response.message);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

### React - Usage in Components

```javascript
// src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
```

---

## 📝 Important Notes

1. **CORS Configuration:** Backend is configured to accept requests from `http://localhost:3000` and the configured `CLIENT_URL`

2. **Credentials:** Always include `credentials: 'include'` in fetch requests or `withCredentials: true` in axios to send cookies

3. **Encryption Key:** Store the encryption key in environment variables (`.env.local` in React):
   ```
   REACT_APP_ENCRYPTION_KEY=your-jwt-secret-here
   ```

4. **Error Handling:** Always check the `error` field in responses before accessing `data`

5. **File Uploads:** Use `FormData` for endpoints that accept files (user profile, events)

6. **Validation Errors:** Check `validationErrors` array for field-specific error messages

7. **Token Expiry:** JWT tokens expire after 24 hours. Implement auto-logout or token refresh

8. **API Documentation:** Full Swagger documentation available at: `http://localhost:3001/api-docs`

---

## 🚀 Production Configuration

When deploying to production:

1. Update base URLs to production endpoints
2. Ensure HTTPS is enabled
3. Update CORS origins in backend
4. Use secure environment variables
5. Implement proper error logging
6. Add request/response interceptors for monitoring

---

## 📞 Support

For issues or questions:
- Check Swagger docs: http://localhost:3001/api-docs
- Review error codes above
- Check backend logs for detailed error information

---

**Last Updated:** November 6, 2025
**Backend Version:** 1.0.0

