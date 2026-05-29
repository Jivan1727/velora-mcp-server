FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# ---

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production --ignore-scripts

# Copy built artifacts from builder
COPY --from=builder /app/build ./build

# Expose the HTTP port (Render/Railway will provide PORT environment variable)
EXPOSE 3000

# Start the HTTP server
CMD ["node", "build/index.js"]
