FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY babel.config.js ./
COPY config ./config
COPY src-taro ./src-taro
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vitest.config.ts ./

RUN npm run taro:build:h5

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist-taro /usr/share/nginx/html

EXPOSE 80
