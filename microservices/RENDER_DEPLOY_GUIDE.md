# 🚀 Deploying Microservices to Render - Complete Guide

## Your Current Setup

```
backend/
├── src/ (monolithic - can keep or deprecate)
└── microservices/
    ├── shared/
    ├── prisma/
    ├── auth-service/
    ├── user-service/
    ├── event-service/
    ├── transaction-service/
    ├── admin-service/
    ├── upload-service/
    └── api-gateway/
```

---

## 🎯 Deployment Strategy

### Option A: **Deploy Microservices Only** (Recommended)
- ✅ Modern architecture
- ✅ Better scalability
- ✅ Use API Gateway as single entry point
- ❌ Requires migration effort

### Option B: **Deploy Monolith + Microservices** (Safe Migration)
- ✅ Zero downtime
- ✅ Gradual migration
- ✅ Fallback available
- ❌ Higher cost (more services)

### Option C: **Deploy Monolith Only**
- ✅ Quick and simple
- ✅ Lower cost initially
- ❌ No microservices benefits

---

## 📋 Prerequisites

1. ☑️ GitHub/GitLab account
2. ☑️ Render.com account
3. ☑️ Push your code to Git repository
4. ☑️ Environment variables ready

---

## 🚀 RECOMMENDED: Deploy via Render Dashboard (Easiest)

### Step 1: Prepare Your Repository

```bash
# Make sure everything is committed
cd /home/sachin-int179/Desktop/backend
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Deploy PostgreSQL Database First

1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `evently-postgres`
   - **Database**: `evently_db`
   - **User**: `admin`
   - **Region**: `Oregon (US West)`
   - **Plan**: `Starter ($7/month)` or `Free (90 days)`
4. Click "Create Database"
5. **Copy Internal Database URL** (starts with `postgresql://...`)

### Step 3: Deploy Redis (Use External Service)

Since Render Redis is $7/month, use **Upstash Redis Free**:

1. Go to https://upstash.com/
2. Create free Redis database
3. Copy the Redis URL

**Alternative**: Use Render Redis:
1. Render Dashboard → "New +" → "Redis"
2. Create and copy connection string

### Step 4: Deploy Each Microservice

#### A. Auth Service

1. Render Dashboard → "New +" → "Web Service"
2. Connect your Git repository
3. Configure:
   - **Name**: `auth-service`
   - **Region**: `Oregon`
   - **Branch**: `main`
   - **Root Directory**: `microservices/auth-service`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Build Context**: `microservices/auth-service`
   - **Plan**: `Starter ($7/month)` or `Free (spins down)`

4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<paste-your-postgres-url>
   REDIS_URL=<paste-your-redis-url>
   JWT_SECRET=<generate-64-char-secret>
   ENCRYPTION_KEY=<generate-64-char-secret>
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   CLIENT_URL=https://your-frontend.onrender.com
   ```

5. Click "Create Web Service"
6. **Save the service URL**: `https://auth-service-xxx.onrender.com`

#### B. Repeat for Other Services

**User Service**:
- Root Directory: `microservices/user-service`
- Port: `3002`
- Additional env: `AUTH_SERVICE_URL=https://auth-service-xxx.onrender.com`

**Event Service**:
- Root Directory: `microservices/event-service`
- Port: `3003`

**Transaction Service**:
- Root Directory: `microservices/transaction-service`
- Port: `3004`
- Additional env: 
  ```
  RAZORPAY_KEY_ID=your-key
  RAZORPAY_KEY_SECRET=your-secret
  ```

**Admin Service**:
- Root Directory: `microservices/admin-service`
- Port: `3005`

**Upload Service**:
- Root Directory: `microservices/upload-service`
- Port: `3006`
- Additional env:
  ```
  R2_BUCKET=your-bucket
  R2_ENDPOINT=your-endpoint
  R2_ACCESS_KEY_ID=your-key
  R2_SECRET_ACCESS_KEY=your-secret
  R2_PUBLIC_URL=your-url
  ```

#### C. Deploy API Gateway (Last)

1. Root Directory: `microservices/api-gateway`
2. Port: `3000`
3. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3000
   AUTH_SERVICE_URL=https://auth-service-xxx.onrender.com
   USER_SERVICE_URL=https://user-service-xxx.onrender.com
   EVENT_SERVICE_URL=https://event-service-xxx.onrender.com
   TRANSACTION_SERVICE_URL=https://transaction-service-xxx.onrender.com
   ADMIN_SERVICE_URL=https://admin-service-xxx.onrender.com
   UPLOAD_SERVICE_URL=https://upload-service-xxx.onrender.com
   CLIENT_URL=https://your-frontend.onrender.com
   ```

4. **This is your main API URL**: `https://api-gateway-xxx.onrender.com`
5. Point your frontend to this URL

---

## 🐳 Alternative: Fix Dockerfiles for Better Render Support

Since your services use shared code, we need to build from the parent context:

### Update render.yaml

```yaml
services:
  - type: web
    name: auth-service
    env: docker
    region: oregon
    plan: starter
    # Build from microservices root
    dockerfilePath: ./auth-service/Dockerfile
    dockerContext: .  # ← This is microservices/
    envVars:
      # ... your env vars
```

### Update Dockerfile (for each service)

Example for `auth-service/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared folder (relative to dockerContext = microservices/)
COPY shared ./shared
COPY prisma ./prisma

# Copy auth service
COPY auth-service/package*.json ./auth-service/
WORKDIR /app/auth-service
RUN npm ci

# Generate Prisma
RUN npx prisma generate

# Copy source
COPY auth-service/src ./src
COPY auth-service/tsconfig.json ./

# Build
RUN npm run build

# ============================================
# Production
# ============================================
FROM node:20-alpine

WORKDIR /app

# Copy production files
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/auth-service/package*.json ./
COPY --from=builder /app/auth-service/dist ./dist
COPY --from=builder /app/auth-service/node_modules/.prisma ./node_modules/.prisma

# Install production deps
RUN npm ci --only=production

EXPOSE 3001

CMD ["node", "dist/auth-service/src/index.js"]
```

---

## 💰 Cost Breakdown

### Free Tier (Testing)
- ✅ PostgreSQL: Free (90 days)
- ✅ Redis: Upstash Free
- ✅ 3 Web Services: Free (spin down after 15 min)
- **Total**: $0/month (limited)

### Production Ready
- PostgreSQL: $7/month
- Redis: Free (Upstash) or $7/month (Render)
- 7 Web Services @ $7/each: $49/month
- **Total**: $56-63/month

### Budget Option
- Deploy only API Gateway + 2-3 critical services: ~$21-28/month
- Use external DB/Redis (Supabase + Upstash free tiers): $0
- **Total**: $21-28/month

---

## 🔧 Environment Variables to Prepare

Create a file `.env.production` with all your production values:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/evently_db
REDIS_URL=redis://default:pass@host:6379

# Auth
JWT_SECRET=<generate-with: openssl rand -hex 32>
ENCRYPTION_KEY=<generate-with: openssl rand -hex 32>

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Payment
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Storage (Cloudflare R2)
R2_BUCKET=your-bucket-name
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_PUBLIC_URL=https://your-public-url.com

# CORS
CLIENT_URL=https://your-frontend-app.onrender.com

# Inter-service URLs (fill after deploying)
AUTH_SERVICE_URL=https://auth-service-xxx.onrender.com
USER_SERVICE_URL=https://user-service-xxx.onrender.com
EVENT_SERVICE_URL=https://event-service-xxx.onrender.com
TRANSACTION_SERVICE_URL=https://transaction-service-xxx.onrender.com
ADMIN_SERVICE_URL=https://admin-service-xxx.onrender.com
UPLOAD_SERVICE_URL=https://upload-service-xxx.onrender.com
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All services build successfully locally
- [ ] Docker images tested
- [ ] Environment variables prepared
- [ ] Database schema ready
- [ ] Git repository updated

### Deployment Order
1. [ ] Deploy PostgreSQL database
2. [ ] Deploy Redis (or setup Upstash)
3. [ ] Deploy Auth Service
4. [ ] Deploy User Service
5. [ ] Deploy Event Service
6. [ ] Deploy Transaction Service
7. [ ] Deploy Admin Service
8. [ ] Deploy Upload Service
9. [ ] Deploy API Gateway (last)

### Post-Deployment
- [ ] Run database migrations
- [ ] Test all service health endpoints
- [ ] Test inter-service communication
- [ ] Update frontend API URL
- [ ] Test end-to-end flows
- [ ] Set up monitoring/alerts
- [ ] Configure custom domains (optional)

---

## 🧪 Testing Deployed Services

```bash
# Test health endpoints
curl https://auth-service-xxx.onrender.com/health
curl https://api-gateway-xxx.onrender.com/health

# Test API Gateway routing
curl https://api-gateway-xxx.onrender.com/api/v1/auth/users/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"Test123!","gender":"male"}'
```

---

## 🚨 Common Issues & Solutions

### Issue: Build fails with "Cannot find shared module"
**Solution**: Set `dockerContext` to microservices root in render.yaml

### Issue: Service crashes with "Cannot connect to database"
**Solution**: Use **Internal Database URL** from Render, not public one

### Issue: Services can't communicate
**Solution**: Use full Render URLs (https://...) not localhost

### Issue: Free tier services spin down
**Solution**: Upgrade to Starter plan ($7/service) or use cron job to ping

### Issue: "Module not found" errors
**Solution**: Check `node_modules/.prisma` is copied in Dockerfile

---

## 🎯 Quick Start (TL;DR)

1. **Push code to GitHub**
2. **Create Render account**
3. **Deploy database first**
4. **Deploy each service via dashboard** (7 services)
5. **Deploy API Gateway last**
6. **Point frontend to API Gateway URL**
7. **Test and monitor**

---

## 📞 Need Help?

Common resources:
- Render Docs: https://render.com/docs
- Your services should have `/health` endpoints
- Check Render logs for errors
- Use Render Shell for debugging

---

Good luck with your deployment! 🚀

