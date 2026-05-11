# Multistage build: vite build → nginx:alpine with conf + dist baked in.
# Build context is `frontend/`. TLS certs are bind-mounted at runtime
# (./frontend/tls:/etc/nginx/tls) — never baked into the image.
FROM node:20-alpine AS build
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 443
