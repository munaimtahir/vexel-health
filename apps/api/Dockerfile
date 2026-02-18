FROM node:20-alpine

RUN corepack enable

WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy source code
COPY . .

# Install dependencies (including workspace packages)
RUN pnpm install --frozen-lockfile

# Build API
RUN pnpm --filter api build
RUN cd apps/api && npx prisma generate

# Execute
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main"]
