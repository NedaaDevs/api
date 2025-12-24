FROM oven/bun AS build

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install --ignore-scripts

COPY ./src ./src
COPY ./build.ts ./build.ts

ENV NODE_ENV=production

RUN bun run build.ts --compile

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/server server

ENV NODE_ENV=production

CMD ["./server"]

EXPOSE 3004
