FROM node:20-alpine

RUN corepack enable

WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy source code
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Web
RUN pnpm --filter web build

# Execute
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
