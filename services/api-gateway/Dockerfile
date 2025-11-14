# 1. Base image
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# 2. Copy package files
COPY package*.json ./

# 3. Install all dependencies including dev deps
RUN npm install

# 4. Copy all source code
COPY . .

# 5. Build TypeScript → dist
RUN npm run build

# --- Runtime Stage ---
FROM node:20-alpine
WORKDIR /usr/src/app

# 6. Copy only package.json
COPY package*.json ./

# 7. Install only production deps
RUN npm install --omit=dev

# 8. Copy built dist from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# 9. Expose port
EXPOSE 8000

# 10. Start application
CMD ["npm", "start"]
