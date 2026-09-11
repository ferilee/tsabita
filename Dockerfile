FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG PUBLIC_SITE_URL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
RUN bun run build

FROM oven/bun:1-slim AS production

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_FILE_NAME=/app/data/tsabita.sqlite

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle ./drizzle

RUN mkdir -p /app/data /app/src/content/published-blog /app/src/content/published-projects

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const response = await fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/api/health'); process.exit(response.ok ? 0 : 1)"

CMD ["bun", "run", "src/server/index.ts"]
