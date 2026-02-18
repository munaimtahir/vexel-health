FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm ci

RUN npm run build --workspace=web

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
