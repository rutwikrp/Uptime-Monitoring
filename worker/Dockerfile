# worker/Dockerfile
FROM node:20-alpine

RUN apk add --no-cache bash netcat-openbsd

# Create non-root user
RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

COPY . .

# install only worker deps
RUN cd worker && npm ci --production

RUN chown -R app:app /app
USER app

ENV NODE_ENV=production

CMD ["sh", "-c", "sh scripts/wait-for-db.sh && node scripts/migrate.js && node worker/worker.js"]
