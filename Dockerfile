FROM node:20-alpine

# create non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src 
COPY .env ./

# Switch User
USER app

# Expose port
EXPOSE 3000

# Run the actual process (PID 1)
CMD ["node", "src/server.js"]