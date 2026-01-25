FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm install typescript && npx tsc

# Expose WebSocket port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]
