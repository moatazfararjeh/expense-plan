# Multi-stage build for Expense Plan Application

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# Keep memory low to avoid CPU throttling on small VPS
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV CI=false
ENV GENERATE_SOURCEMAP=false

# Accept API URL as build argument
ARG REACT_APP_API_URL=https://expense.ardalsharq.com
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Backend
FROM node:18-alpine
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/build ./public

# Expose backend port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production

# Start the backend server
CMD ["node", "server.js"]
