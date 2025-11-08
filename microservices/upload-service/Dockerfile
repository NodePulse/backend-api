FROM node:20-alpine AS builder

WORKDIR /app

COPY upload-service/package*.json ./
RUN npm install

COPY shared ../../shared

COPY upload-service/. .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY upload-service/package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/../../shared ../../shared

EXPOSE 3006

CMD ["node", "dist/index.js"]
