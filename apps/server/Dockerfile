# The Camelot engine, packaged so it runs the same on any machine.
# Build context is the repository root (see docker-compose.yml).
FROM node:20-alpine

WORKDIR /app

# Copy the whole workspace (node_modules/dist are excluded via .dockerignore)
# and install dependencies for every package.
COPY . .
RUN npm install

# The engine reads/writes saved agents here; docker-compose mounts a volume on
# /data so customizations survive restarts.
ENV CAMELOT_DATA_FILE=/data/agents.json
ENV PORT=4000

WORKDIR /app/apps/server
EXPOSE 4000

CMD ["npm", "run", "start"]
