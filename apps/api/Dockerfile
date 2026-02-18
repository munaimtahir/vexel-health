FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm ci
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace=api

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main"]
