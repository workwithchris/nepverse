FROM node:22-slim AS build
WORKDIR /repo
COPY . .
RUN npm ci
RUN npx nx build web

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
