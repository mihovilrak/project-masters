# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24.21.0-alpine3.23

# Build frontend
FROM ${NODE_IMAGE} AS frontend-builder

WORKDIR /app/fe

COPY fe/package.json fe/yarn.lock fe/.yarnrc ./

RUN --mount=type=cache,id=yarn-fe,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile

COPY fe/tsconfig.json fe/vite.config.ts fe/index.html ./
COPY fe/src/ ./src/

RUN yarn run build

# Build backend
FROM ${NODE_IMAGE} AS backend-builder

WORKDIR /app/api

COPY packages/backend-common/ /app/packages/backend-common/
COPY api/package.json api/yarn.lock ./

RUN --mount=type=cache,id=yarn-api,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile

COPY api/tsconfig.json ./
COPY api/src/ ./src/

# ncc compiles the TypeScript entry point itself; CI runs type-check and lint.
RUN yarn run ncc build src/server.ts -o dist -q

# Build notification service
FROM ${NODE_IMAGE} AS notification-builder

WORKDIR /app/service

COPY packages/backend-common/ /app/packages/backend-common/
COPY notification-service/package.json notification-service/yarn.lock ./

RUN --mount=type=cache,id=yarn-service,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile

COPY notification-service/tsconfig.json ./
COPY notification-service/src/ ./src/

RUN yarn run ncc build src/index.ts -o dist -q && \
    mkdir -p dist/templates && \
    cp -r src/templates/* dist/templates/

# Final image
FROM nginx:1.31.2-alpine3.23

WORKDIR /app

# One image, one process per compose service: nginx (default CMD), the API,
# the notification service and the one-shot db migration (db/migrate.sh).
# Node comes from the builder base so build and runtime share a version.
COPY --from=backend-builder /usr/local/bin/node /usr/local/bin/node

RUN apk add --no-cache \
    libstdc++ \
    postgresql18-client && \
    mkdir -p api service uploads && \
    chown nginx:nginx /app/uploads && \
    chown -R nginx:nginx /var/cache/nginx

# Database migrations and helper scripts
COPY db/init/ ./db/init/
COPY --chmod=755 db/migrate.sh db/seed-admin.sh db/backup.sh db/backup-scheduler.sh ./db/
COPY db/pgpass.sh db/app-role.sql ./db/

# Copy built applications
COPY --from=frontend-builder /app/fe/build /usr/share/nginx/html
COPY --from=backend-builder /app/api/dist/index.js ./api/
COPY --from=notification-builder /app/service/dist/index.js ./service/
COPY --from=notification-builder /app/service/dist/templates/ ./service/templates/

# Copy NGINX configuration
COPY fe/nginx.conf /etc/nginx/nginx.conf
COPY fe/snippets/ /etc/nginx/snippets/

# Volume-backed: the rest of the filesystem is read-only at runtime.
ENV UPLOADS_DIR=/app/uploads
ENV TEMPLATES_PATH=/app/service/templates

# 8080 nginx, 5000 api, 5001 notification service
EXPOSE 8080 5000 5001

USER nginx

CMD ["nginx", "-g", "daemon off;"]
