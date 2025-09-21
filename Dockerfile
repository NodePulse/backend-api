# ---- Stage 1: Build the application ----
# Use a specific Node.js version with Alpine Linux for a smaller base image
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install all dependencies (including devDependencies for building)
COPY package*.json ./
RUN npm ci

# Copy Prisma schema to generate the client
COPY prisma ./prisma/

# Generate Prisma Client
# This is crucial to ensure the client is built for the container's environment
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build


# ---- Stage 2: Create the final production image ----
FROM node:20-alpine

WORKDIR /app

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the compiled code and generated Prisma client from the 'builder' stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose the port the app runs on
EXPOSE 8080

# The command to run the application
CMD ["node", "dist/index.js"]
