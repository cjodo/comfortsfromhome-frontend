# Build the static site
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Railway passes these in at build time; used for canonical/social URLs.
ARG SITE_URL
ARG RAILWAY_PUBLIC_DOMAIN
RUN npm run build

# Serve it with Caddy, plus the photo upload admin at /admin
FROM caddy:2-alpine
RUN apk add --no-cache nodejs
COPY Caddyfile /etc/caddy/Caddyfile
COPY admin /admin
COPY --from=build /app/dist /srv
RUN chmod +x /admin/start.sh
CMD ["/admin/start.sh"]
