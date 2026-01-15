# Multi-stage Dockerfile for ERC-20 Token Faucet DApp

# Stage 1: Smart Contract Build
FROM node:18-alpine AS contracts-build

WORKDIR /app

# Copy contract-related files
COPY package*.json ./
COPY hardhat.config.js ./
COPY contracts/ ./contracts/
COPY scripts/ ./scripts/
COPY test/ ./test/

# Install dependencies and compile contracts
RUN npm ci
RUN npm run compile

# Stage 2: Frontend Build
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 3: Production
FROM node:18-alpine

WORKDIR /app

# Copy compiled contracts from stage 1
COPY --from=contracts-build /app/artifacts ./artifacts
COPY --from=contracts-build /app/node_modules ./node_modules
COPY --from=contracts-build /app/package*.json ./
COPY --from=contracts-build /app/hardhat.config.js ./
COPY --from=contracts-build /app/contracts ./contracts
COPY --from=contracts-build /app/scripts ./scripts

# Copy built frontend from stage 2
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
COPY --from=frontend-build /app/frontend/package*.json ./frontend/

# Install serve for frontend
RUN npm install -g serve

# Expose ports
EXPOSE 3000 5173

# Default command
CMD ["npm", "test"]
