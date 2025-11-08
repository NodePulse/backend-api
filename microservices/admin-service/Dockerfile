FROM node:20-alpine AS builder

WORKDIR /app

COPY admin-service/package*.json ./
RUN npm install

COPY shared ../../shared
COPY prisma ../../prisma
RUN npx prisma generate

COPY admin-service/. .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY admin-service/package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/../../shared ../../shared

EXPOSE 3005

CMD ["node", "dist/index.js"]
