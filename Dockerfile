FROM node:24.17.0-alpine AS deps
WORKDIR /app
COPY ["package.json", "package-lock.json", "./"]
RUN ["npm", "install"]

FROM node:24.17.0-alpine AS builder
WORKDIR /app
COPY ["tsconfig.build.json", "tsconfig.json", "./"]
COPY ["src/", "./src/"]
COPY [".env", "./"]
COPY --from=deps /app/node_modules ./node_modules
RUN ["npx", "nest", "build"]

FROM node:24.17.0-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env ./

CMD ["node", "dist/main"]

EXPOSE 80
