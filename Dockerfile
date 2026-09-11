# Build frontend
FROM node:25.4.0-alpine3.23 AS frontend-builder

# Set working directory
WORKDIR /app/fe

# Copy package and lock files
COPY fe/package*.json fe/yarn.lock fe/tsconfig.json fe/.yarnrc fe/vite.config.ts fe/index.html ./

# Install dependencies
RUN yarn config set cache-folder /tmp/yarn-cache && \
    yarn install --frozen-lockfile --prefer-offline --production=false && \
    yarn cache clean --all

# Copy source code
COPY fe/src/ ./src/

# Type check and build the frontend
RUN yarn run type-check && \
    yarn run build

# Build backend
FROM node:25.4.0-alpine3.23 AS backend-builder

# Set working directory
WORKDIR /app/api

COPY packages/backend-common/ /app/packages/backend-common/

# Copy package and lock files
COPY api/package*.json api/yarn.lock api/tsconfig.json api/eslint.config.mjs ./

# Install dependencies
RUN mkdir node_modules && \
    yarn config set cache-folder /tmp/yarn-cache && \
    yarn install --frozen-lockfile --prefer-offline \
    --production=false && \
    yarn cache clean --all

# Copy source code
COPY api/src/ ./src/

# Type check and lint the API
RUN yarn run type-check && \
    yarn run lint && \
    yarn run tsc && \
    npm install -g @vercel/ncc && \
    ncc build dist/server.js -o dist --no-cache -q

# Build notification service
FROM node:25.4.0-alpine3.23 AS notification-builder

# Set working directory
WORKDIR /app/service

COPY packages/backend-common/ /app/packages/backend-common/

# Copy package and lock files
COPY notification-service/package*.json notification-service/yarn.lock \
    notification-service/tsconfig.json notification-service/eslint.config.mjs ./

# Install dependencies
RUN mkdir node_modules && \
    yarn config set cache-folder /tmp/yarn-cache && \
    yarn install --frozen-lockfile --prefer-offline \
    --production=false --link-duplicates --ignore-optional && \
    npm install -g @vercel/ncc && \
    yarn cache clean --all

# Copy source code
COPY notification-service/src/ ./src/

# Type check and lint the notification service
RUN yarn run type-check && \
    yarn run lint && \
    yarn run tsc && \
    npm install -g @vercel/ncc && \
    ncc build dist/index.js -o dist --no-cache -q && \
    mkdir -p dist/templates && \
    cp -r src/templates/* dist/templates/

# Final image
FROM nginx:1.29.4-alpine3.23

# Copy built applications
WORKDIR /app

# One image, one process per compose service: nginx (default CMD), the API,
# the notification service and the one-shot db migration (db/migrate.sh).
RUN apk add --no-cache \
    nodejs \
    npm \
    postgresql-client && \
    mkdir -p api service uploads config && \
    chown -R nginx:nginx /app /var/cache/nginx

# Database migrations and helper scripts
COPY db/init/ ./db/init/
COPY --chmod=755 db/migrate.sh db/seed-admin.sh ./db/
COPY db/pgpass.sh db/app-role.sql ./db/

# Copy built applications
COPY --from=frontend-builder /app/fe/build /usr/share/nginx/html
COPY --from=backend-builder /app/api/dist/index.js ./api/
COPY --from=notification-builder /app/service/dist/index.js ./service/
COPY --from=notification-builder /app/service/dist/templates/ ./service/templates/

# Copy NGINX configuration
COPY fe/nginx.conf /etc/nginx/nginx.conf

# Both are volume-backed: the rest of the filesystem is read-only at runtime.
ENV UPLOADS_DIR=/app/uploads
ENV ENV_FILE_PATH=/app/config/.env
ENV TEMPLATES_PATH=/app/service/templates

# 8080 nginx, 5000 api, 5001 notification service
EXPOSE 8080 5000 5001

USER nginx

CMD ["nginx", "-g", "daemon off;"]
