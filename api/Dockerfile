#api/Dockerfile

FROM node:20-alpine

#install minimal tooling for migrations and(running app)
RUN apk add  --no-cache bash netcat-openbsd

RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

COPY . . 

RUN cd api && npm ci --production

RUN chown -R app:app /app
USER app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD [ "sh", "-c", "sh scripts/wait-for-db.sh && node scripts/migrate.js && node api/server.js" ]