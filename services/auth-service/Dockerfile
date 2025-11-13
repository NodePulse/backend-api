# 1. Use official Node.js 20 image
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# 2. Copy only package files first for caching
COPY package*.json ./

# 3. Install production dependencies
RUN npm install --omit=dev

# 4. Copy the entire project
COPY . .

# 5. Build TypeScript
RUN npm run build && npx prisma generate

# 6. Expose the app port
EXPOSE 8081

# 7. Start command
CMD ["npm", "start"]
