# CartMinimal - Replit.md

## Overview

CartMinimal is a minimalist grocery/shopping list management app. It has two main views:

1. **Item Database** - A searchable, sortable catalog of all items (name, category, notes, image, quantity)
2. **Shopping List** - Per-store shopping lists with drag-and-drop reordering

Users create items in the database, then add them to any store's shopping list. Each store has its own independent list. The selected store is persisted in localStorage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React (via Vite), TypeScript, no SSR
- **Routing**: `wouter` - two routes: `/` (Shopping List) and `/database` (Item Database)
- **State / Data Fetching**: TanStack Query (`@tanstack/react-query`) for all server state
- **Forms**: `react-hook-form` with `@hookform/resolvers` and Zod for validation
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives + Tailwind CSS
- **Drag and Drop**: `@dnd-kit/core` and `@dnd-kit/sortable` for per-store list reordering
- **Real-time**: SSE via `useRealtime` hook; broadcasts item and store list events to all clients
- **Store context**: `client/src/context/store-context.tsx` — global selected store state persisted to localStorage
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend

- **Runtime**: Node.js with Express, TypeScript, run via `tsx`
- **API**: RESTful JSON API under `/api/`. Shared route definitions in `shared/routes.ts`
- **SSE**: `server/sse.ts` — manages connected clients and broadcasts typed events
- **File Uploads**: `multer` — images stored at `client/public/uploads/`

### Shared Layer (`shared/`)

- `shared/schema.ts` - Drizzle table definitions + Zod schemas
- `shared/routes.ts` - Typed API route map

### Data Storage

- **Database**: PostgreSQL via `drizzle-orm/node-postgres`
- **Schema**:
  - `items` - catalog: `id`, `name`, `category`, `notes`, `imageUrl`, `quantity`, `createdAt` (plus legacy `inShoppingList`, `listOrder` columns kept for compat)
  - `stores` - store definitions: `id`, `name`
  - `store_list_items` - per-store list: `id`, `storeId`, `itemId`, `quantity`, `listOrder`
- **Storage layer**: `server/storage.ts` exports `DatabaseStorage` implementing `IStorage`

### Key Design Decisions

- **Multi-store lists**: Each store has its own list in `storeListItems`. Items in the database are a shared catalog. Adding to list = inserting a `storeListItems` row.
- **Selected store**: Stored globally in `StoreContext` (localStorage-backed). The database page reads this to know which store's list to toggle.
- **Order memory**: `listOrder` on `storeListItems` preserves position. `hasInitialized` ref prevents re-sorting after first load.
- **Preset stores**: 12 UK supermarkets preloaded in the dropdown + "Custom" option for any name.
- **Shared schema and routes**: Both frontend and backend import from `shared/`. Types stay in sync without code generation.
- **Client-side sort/filter**: Database page filters/sorts in memory for snappy interactions.
- **Real-time collaboration**: SSE broadcasts `store:list:added/updated/removed/reordered` events; `useRealtime` updates TanStack Query cache directly.

## External Dependencies

| Dependency | Purpose |
|---|---|
| PostgreSQL | Primary data store (requires `DATABASE_URL` env var) |
| Drizzle ORM + drizzle-kit | Database access layer and schema migrations |
| Google Fonts | DM Sans and Outfit typefaces |
| multer | Multipart file upload handling for item images |
| Radix UI | Accessible headless UI primitives (used by all shadcn components) |
| @dnd-kit | Drag-and-drop for per-store shopping list reordering |
| TanStack Query | Server state management and caching |
| Zod | Runtime validation shared between client and server |
| Vite + @replit/vite-plugin-* | Dev server, HMR, and Replit-specific dev tooling |
| esbuild | Production server bundling |
