FROM node:22-alpine AS builder

WORKDIR /app

# Increase Node heap for Vite build on low-memory hosts
ENV NODE_OPTIONS=--max-old-space-size=4096

ARG VITE_API_BASE_URL=/api
ARG VITE_AUTH_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AUTH_BASE_URL=${VITE_AUTH_BASE_URL}

COPY package*.json ./
RUN npm ci --registry=https://registry.npmmirror.com

COPY . .
RUN npm run build

FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
