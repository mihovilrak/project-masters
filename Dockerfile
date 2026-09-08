# Build frontend
FROM node:25.4.0-alpine3.23 AS frontend-builder

# Set working directory
WORKDIR /app/fe

# Copy package and lock files
COPY fe/package*.json fe/yarn.lock fe/tsconfig.json fe/.yarnrc fe/config-overrides.js ./

# Install dependencies
RUN mkdir node_modules && \
    yarn config set cache-folder /tmp/yarn-cache && \
    (yarn install --frozen-lockfile --prefer-offline --production=false || \
     yarn install --prefer-offline --production=false) && \
    yarn add -D @babel/plugin-proposal-private-property-in-object react-app-rewired && \
    yarn cache clean --all

# Copy source code
COPY fe/src/ ./src/
COPY fe/public/ ./public/

# Set environment variables
ENV NODE_OPTIONS=--openssl-legacy-provider
ENV BABEL_ENV=production

# Type check and build the frontend
RUN yarn run type-check && \
    yarn run build --verbose

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

# Copy and set up startup script
COPY start-app.sh /start-app.sh
COPY db/backup.sh /usr/local/bin/backup.sh
COPY db/seed-admin.sh /app/seed-admin.sh
COPY db/pg_dump_cron /app/crontabs/nginx

# Install dependencies and set up startup script
RUN apk add --no-cache \
    dcron \
    nodejs \
    npm \
    postgresql-client && \
    chmod +x /start-app.sh && \
    mkdir -p api service db-init uploads /backups /app/crontabs && \
    chmod +x /usr/local/bin/backup.sh && \
    chmod +x /app/seed-admin.sh && \
    chmod 0600 /app/crontabs/nginx && \
    chown -R nginx:nginx /app /backups /var/cache/nginx

# Copy database init scripts
COPY db/init/ ./db-init/

# Copy built applications
COPY --from=frontend-builder /app/fe/build /usr/share/nginx/html
COPY --from=backend-builder /app/api/dist/index.js ./api/
COPY --from=notification-builder /app/service/dist/index.js ./service/
COPY --from=notification-builder /app/service/dist/templates/ ./service/templates/

# Copy NGINX configuration
COPY fe/nginx.conf /etc/nginx/nginx.conf

# Expose ports
EXPOSE 8080 5000

USER nginx

# Start the application
CMD ["/start-app.sh"]
