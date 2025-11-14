# 1. Base image
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# 2. Copy package files
COPY package*.json ./

# 3. Install all dependencies (including dev) for build
RUN npm install

# 4. Copy all source code
COPY . .

# --- Build stage complete ---

# 6. Create a smaller runtime image
FROM node:20-alpine
WORKDIR /usr/src/app

# 7. Copy only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# 8. Copy compiled code + Prisma client from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# 9. Expose port
EXPOSE 8000

# 10. Start app
CMD ["npm", "start"]
