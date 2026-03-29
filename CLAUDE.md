# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SayMyMeal is a full-stack restaurant ordering platform with AI-powered WhatsApp bot integration. Customers can browse menus and place orders via a web app or WhatsApp (voice/text). Restaurant owners manage menus, food items, customization options, and orders through a dashboard.

## Tech Stack

- **Backend**: Fastify 5 + TypeScript, running on Bun
- **Frontend**: Next.js 16 (App Router) + React 19 + TailwindCSS, running on Bun
- **Database**: PostgreSQL 15 with Prisma ORM
- **AI**: OpenAI GPT-4o (WhatsApp conversational ordering, tool calling) + Whisper (voice transcription)
- **Messaging**: Twilio WhatsApp API
- **UI Components**: shadcn/ui (Radix primitives)

## Development Commands

### Docker (preferred)

```bash
# Start all services (db, backend, frontend) with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

### Backend (standalone)

```bash
cd backend
bun install
bun run prisma:generate      # Generate Prisma client
bun run prisma:migrate        # Run database migrations (prisma migrate deploy)
bun run dev                   # Start with hot reload (port 4000)
```

### Frontend (standalone)

```bash
cd frontend
bun install
bun run dev                   # Start with Turbopack (port 3000)
bun run build                 # Production build
bun run lint                  # ESLint
```

### Database

```bash
# In backend directory
bunx prisma migrate dev       # Create and apply new migration
bunx prisma migrate deploy    # Apply pending migrations
bunx prisma studio            # Visual database browser
```

## Architecture

### Backend (`backend/src/`)

Modular architecture with each feature in `modules/`. Each module follows the pattern:
- `controller.ts` — request handlers (factory function receiving app instance)
- `routes.ts` — endpoint registration
- `service.ts` — business logic and Prisma queries
- `*.schema.ts` — Zod validation schemas
- `*.types.ts` — TypeScript interfaces

**Modules**: `auth`, `restaurant`, `menu`, `food`, `food-option`, `order`, `whatsapp`, `openai`

**Plugins** (`plugins/`): Fastify plugins for db (Prisma), CORS, JWT, Swagger, WhatsApp service.

**Auth**: JWT-based. Middleware in `middleware/auth.ts` with `verifyOwnership()` for resource authorization. Two roles: CUSTOMER and OWNER.

**WhatsApp Bot Flow**: Twilio webhook → `whatsapp.controller` → GPT-4o with tool definitions (`shared/tools.ts`) → tool handlers (`toolHandlers.ts`) execute against DB → LLM generates response. Sessions expire after 15 minutes.

### Frontend (`frontend/`)

Next.js App Router structure:
- `app/[slug]/` — Customer-facing: menu browsing, cart, checkout (dynamic by restaurant slug)
- `app/dashboard/` — Owner-facing: restaurant management
- `app/orders/` — Customer order history
- `components/` — React components including shadcn/ui in `components/ui/`
- `lib/auth-context.tsx` — Auth provider with JWT token management
- `lib/cart-context.tsx` — Cart state management
- `lib/api.ts` — API client functions (all backend calls)
- `lib/config.ts` — Environment config (`NEXT_PUBLIC_API_URL`)

Data fetching uses SWR. Forms use React Hook Form + Zod.

### Database Schema (Prisma)

Core models: `User` → `Restaurant` → `Menu` → `Food` → `FoodOption`, with `Order` linking customers to food items. Restaurants have a `pollToken` for tablet/kitchen display polling.

## API Documentation

Swagger UI available at `http://localhost:4000/docs` when backend is running.

## Environment

Copy `.env.example` to `backend/.env` and `frontend/.env.local`. Key variables: `OPENAI_API_KEY`, `API_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `POSTGRES_*`.

## No Test Suite

There is currently no automated testing framework configured.
