# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

# Create data directory (actual data provided via volume mount)
RUN mkdir -p /app/data/uploads

# Copy frontend build output to backend/public
COPY --from=frontend-build /app/frontend/dist ./public

# Data volume for persistence
VOLUME /app/data

EXPOSE 3000

CMD ["node", "server.js"]
