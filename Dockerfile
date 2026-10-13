# syntax=docker/dockerfile:1

# Build the static Astro site with the Node version required by the project.
FROM node:22-alpine AS builder

WORKDIR /app

# Corepack reads the pnpm version pinned in package.json.
RUN corepack enable

# Copy manifests first so this layer is reused when application code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Serve only the generated static files in the final image.
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
