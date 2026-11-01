# syntax=docker/dockerfile:1

ARG NODE_VERSION=24-bookworm-slim

# ---- builder: install full dependency tree against the locked versions ----
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/src ./src

# ---- runtime: production-only dependencies, non-root user ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ARG PORT=3000
ARG GIT_COMMIT_SHA=unknown
ARG BUILD_TIMESTAMP=""
ENV PORT=${PORT}
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP}

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/src ./src

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --gid 1001 appuser \
  && chown -R appuser:appgroup /app

USER appuser

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
