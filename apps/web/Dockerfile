# The Camelot website: build the static site, then serve it with nginx.
# Build context is the repository root (see docker-compose.yml).

# ---- Stage 1: build the static website ----
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build --workspace @camelot/web

# ---- Stage 2: serve it ----
FROM nginx:alpine
# nginx serves the built files and forwards /api calls to the engine.
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
