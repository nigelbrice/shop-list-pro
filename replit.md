# Shopeeze - Replit.md

## Overview

Shopeeze is a minimalist grocery/shopping list management app with account-based authentication. It has two main views:

1. **Item Database** - A searchable, sortable catalog of all items (name, category, notes, image, quantity)
2. **Shopping List** - Per-store shopping lists with drag-and-drop reordering and pill-style store tabs

Users register an account, then create items in the database and add them to any store's shopping list. Each store has its own independent list. The selected store is persisted in localStorage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React (via Vite), TypeScript, no SSR
- **Routing**: `wouter` - two routes: `/` (Shopping List) and `/database` (Item Database); login page rendered instead of router if not authenticated
- **State / Data Fetching**: TanStack Query (`@tanstack/react-query`) for all server state
- **Forms**: `react-hook-form` with `@hookform/resolvers` and Zod for validation
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives + Tailwind CSS
- **Drag and Drop**: `@dnd-kit/core` and `@dnd-kit/sortable` for per-store list reordering
- **Real-time**: SSE via `useRealtime` hook; broadcasts item and store list events per-account
- **Store context**: `client/src/context/store-context.tsx` — global selected store state persisted to localStorage
- **Auth**: `useAuth` hook (TanStack Query) checks `/api/auth/me`; `App.tsx` shows Login page if not authenticated
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend

- **Runtime**: Node.js with Express, TypeScript, run via `tsx`
- **API**: RESTful JSON API under `/api/`. Shared route definitions in `shared/routes.ts`
- **Sessions**: `express-session` with `connect-pg-simple` (PostgreSQL session store). Requires `SESSION_SECRET` env var
- **Auth**: `server/auth.ts` — `requireAuth` middleware, auth routes (`/api/auth/*`)
- **SSE**: `server/sse.ts` — account-scoped connected clients, typed events broadcast per-account
- **File Uploads**: `multer` — images stored at `client/public/uploads/`

### Shared Layer (`shared/`)

- `shared/schema.ts` - Drizzle table definitions + Zod schemas
- `shared/routes.ts` - Typed API route map

### Data Storage

- **Database**: PostgreSQL via `drizzle-orm/node-postgres`
- **Schema**:
  - `accounts` - account: `id`, `name`, `passwordHash`, `createdAt`
  - `account_users` - named members per account (max 6): `id`, `accountId`, `name`, `createdAt`
  - `items` - catalog: `id`, `accountId`, `name`, `category`, `notes`, `imageUrl`, `quantity`, `createdAt`
  - `stores` - store definitions: `id`, `accountId`, `name`
  - `store_list_items` - per-store list: `id`, `storeId`, `itemId`, `quantity`, `listOrder`
  - `session` - express-session PostgreSQL table (auto-created by connect-pg-simple)
- **Storage layer**: `server/storage.ts` exports `DatabaseStorage` implementing `IStorage`
- **Migration**: `migrateOrphanedData()` in storage.ts runs at startup and assigns any pre-auth data to a Demo account (name: "Demo", password: "demo123")

### Key Design Decisions

- **Auth model**: Accounts have a name + password. Up to 6 named member profiles per account (no individual passwords). Login → pick active member like Netflix profiles.
- **Data scoping**: All items and stores are scoped to `accountId` from the session.
- **SSE scoping**: SSE clients are tracked per `accountId` (Map<accountId, Set<Response>>). Events only broadcast to same-account clients.
- **Multi-store lists**: Each store has its own list in `storeListItems`. Items in the database are a per-account shared catalog.
- **Selected store**: Stored globally in `StoreContext` (localStorage-backed).
- **Order memory**: `listOrder` on `storeListItems` preserves position. `hasInitialized` ref prevents re-sorting after first load.
- **Preset stores**: 12 UK supermarkets preloaded in the create panel + "Custom" option for any name.
- **Store tabs**: Pill-style tabs per store with item count badges replace dropdown selector.
- **Shared schema and routes**: Both frontend and backend import from `shared/`. Types stay in sync.
- **Real-time collaboration**: SSE broadcasts `store:list:added/updated/removed/reordered` events; `useRealtime` updates TanStack Query cache directly.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (managed by Replit) |
| `SESSION_SECRET` | Secret for signing session cookies (stored as Replit secret) |

## External Dependencies

| Dependency | Purpose |
|---|---|
| PostgreSQL | Primary data store |
| Drizzle ORM + drizzle-kit | Database access layer and schema migrations |
| bcryptjs | Password hashing |
| express-session | Session management |
| connect-pg-simple | PostgreSQL session store |
| Google Fonts | DM Sans and Outfit typefaces |
| multer | Multipart file upload handling for item images |
| Radix UI | Accessible headless UI primitives (used by all shadcn components) |
| @dnd-kit | Drag-and-drop for per-store shopping list reordering |
| TanStack Query | Server state management and caching |
| Zod | Runtime validation shared between client and server |
| Vite + @replit/vite-plugin-* | Dev server, HMR, and Replit-specific dev tooling |
| esbuild | Production server bundling |
