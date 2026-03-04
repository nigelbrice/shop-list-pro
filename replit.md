# CartMinimal - Replit.md

## Overview

CartMinimal is a minimalist grocery/shopping list management app. It has two main views:

1. **Item Database** - A searchable, sortable catalog of all items (name, category, notes, image, quantity)
2. **Shopping List** - A drag-and-drop reorderable list of items marked as "in shopping list"

Users can create items in the database, then add them to their active shopping list. The shopping list supports drag-and-drop reordering via `@dnd-kit`. Filtering and sorting on the database page happens client-side for fast interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React (via Vite), TypeScript, no SSR
- **Routing**: `wouter` - lightweight client-side router with two routes: `/` (Shopping List) and `/database` (Item Database)
- **State / Data Fetching**: TanStack Query (`@tanstack/react-query`) for all server state. Query keys are derived from the shared API route definitions. Stale time is set to `Infinity` to avoid unnecessary re-fetches.
- **Forms**: `react-hook-form` with `@hookform/resolvers` and Zod for validation. The shared `insertItemSchema` from `shared/schema.ts` is reused directly on the frontend.
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives + Tailwind CSS. All UI components live in `client/src/components/ui/`.
- **Drag and Drop**: `@dnd-kit/core` and `@dnd-kit/sortable` for the shopping list reorder feature.
- **Styling**: Tailwind CSS with CSS variables for theming (clean monochrome palette). Fonts: DM Sans (body) and Outfit (display), loaded from Google Fonts.
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend

- **Runtime**: Node.js with Express, written in TypeScript, run via `tsx`
- **API**: RESTful JSON API under `/api/`. Route definitions (paths, methods, Zod schemas for input/output) are declared in `shared/routes.ts` and consumed by both server (`server/routes.ts`) and client (`client/src/hooks/use-items.ts`)
- **File Uploads**: `multer` handles image uploads; files are stored at `client/public/uploads/` and served as static assets. The endpoint is `POST /api/upload`.
- **Build**: In development, Vite runs as middleware inside Express (via `server/vite.ts`). In production, the client is built with Vite and the server is bundled with `esbuild` into `dist/index.cjs`.

### Shared Layer (`shared/`)

- `shared/schema.ts` - Drizzle table definitions + Zod schemas (single source of truth for types used on both client and server)
- `shared/routes.ts` - Typed API route map with paths, HTTP methods, input schemas, and response schemas

### Data Storage

- **Database**: PostgreSQL via `drizzle-orm/node-postgres`
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations (`drizzle.config.ts` points to `shared/schema.ts`)
- **Schema**: Single `items` table with fields: `id`, `name`, `category`, `notes`, `imageUrl`, `quantity`, `inShoppingList`, `listOrder`, `createdAt`
- **Storage layer**: `server/storage.ts` exports a `DatabaseStorage` class implementing the `IStorage` interface (CRUD + reorder). This abstraction makes it easy to swap storage backends.
- **Connection**: `DATABASE_URL` environment variable required.

### Key Design Decisions

- **Shared schema and routes**: Both frontend and backend import from `shared/`. This eliminates duplication and keeps types in sync without a separate code generation step.
- **Client-side sort/filter**: The Database page fetches all items once and filters/sorts in memory. This keeps interactions snappy and avoids extra round-trips for UI-only concerns.
- **Reorder persistence**: Drag-and-drop reordering calls `POST /api/items/reorder` with the new ordered ID array; the server updates `listOrder` for each item.

## External Dependencies

| Dependency | Purpose |
|---|---|
| PostgreSQL | Primary data store (requires `DATABASE_URL` env var) |
| Drizzle ORM + drizzle-kit | Database access layer and schema migrations |
| Google Fonts | DM Sans and Outfit typefaces (loaded in `index.html` and `index.css`) |
| multer | Multipart file upload handling for item images |
| Radix UI | Accessible headless UI primitives (used by all shadcn components) |
| @dnd-kit | Drag-and-drop for shopping list reordering |
| TanStack Query | Server state management and caching |
| Zod | Runtime validation shared between client and server |
| Vite + @replit/vite-plugin-* | Dev server, HMR, and Replit-specific dev tooling |
| esbuild | Production server bundling |