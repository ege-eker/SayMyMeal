# ---------- Stage 1 – Build/Generate ----------
FROM debian:bookworm-slim AS base

WORKDIR /app

RUN apt-get update -y && apt-get install -y \
    curl ca-certificates openssl unzip \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY package*.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun prisma generate


# ---------- Stage 2 – Runtime ----------
FROM debian:bookworm-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y \
    openssl ca-certificates unzip curl \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY --from=base /app /app

EXPOSE 4000
ENV NODE_ENV=production

CMD ["bun", "run", "start"]