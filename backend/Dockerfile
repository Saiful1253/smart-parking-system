FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ .

# Copy data directory if exists and data files
COPY data ./data

# Create data directory
RUN mkdir -p data

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
