FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src/ packages/shared/src/
COPY web/package.json web/tsconfig.json web/vite.config.ts web/index.html web/
COPY web/src/ web/src/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @whiteboard/web build

FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/web/dist/ public/
COPY server/package.json server/tsconfig.json server/
COPY server/src/ server/src/
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./

RUN pnpm install --frozen-lockfile --prod

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
CMD ["node", "--import", "tsx", "server/src/index.ts"]
