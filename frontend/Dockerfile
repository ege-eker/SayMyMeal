# ---------- Stage 1 – Build ----------
FROM oven/bun:1.3.6-alpine AS builder

WORKDIR /app

COPY package*.json bun.lockb* ./

RUN bun install

COPY . .

ARG API_URL
ARG COMPANY_NAME
ARG COMPANY_ADDRESS
ARG PRIVACY_CONTACT
ENV NEXT_PUBLIC_API_URL=$API_URL
ENV NEXT_PUBLIC_COMPANY_NAME=$COMPANY_NAME
ENV NEXT_PUBLIC_COMPANY_ADDRESS=$COMPANY_ADDRESS
ENV NEXT_PUBLIC_PRIVACY_CONTACT=$PRIVACY_CONTACT

RUN bun run build


# ---------- Stage 2 – Runtime ----------
FROM oven/bun:1.3.6-alpine AS runner

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000
ENV NODE_ENV=production

CMD ["bun", "run", "start"]
