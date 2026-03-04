import { z } from 'zod';
import { insertItemSchema, insertStoreSchema, items, stores, storeListItems } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

const storeListItemWithItemSchema = z.object({
  id: z.number(),
  storeId: z.number(),
  itemId: z.number(),
  quantity: z.number(),
  listOrder: z.number().nullable(),
  item: z.custom<typeof items.$inferSelect>(),
});

export const api = {
  items: {
    list: {
      method: 'GET' as const,
      path: '/api/items' as const,
      responses: { 200: z.array(z.custom<typeof items.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/items' as const,
      input: insertItemSchema,
      responses: { 201: z.custom<typeof items.$inferSelect>(), 400: errorSchemas.validation },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/items/:id' as const,
      input: insertItemSchema.partial(),
      responses: { 200: z.custom<typeof items.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/items/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
    reorder: {
      method: 'POST' as const,
      path: '/api/items/reorder' as const,
      input: z.object({ orderedIds: z.array(z.number()) }),
      responses: { 200: z.object({ success: z.boolean() }) },
    },
  },
  stores: {
    list: {
      method: 'GET' as const,
      path: '/api/stores' as const,
      responses: { 200: z.array(z.custom<typeof stores.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/stores' as const,
      input: insertStoreSchema,
      responses: { 201: z.custom<typeof stores.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/stores/:id' as const,
      responses: { 204: z.void() },
    },
    getList: {
      method: 'GET' as const,
      path: '/api/stores/:storeId/list' as const,
      responses: { 200: z.array(storeListItemWithItemSchema) },
    },
    addToList: {
      method: 'POST' as const,
      path: '/api/stores/:storeId/list' as const,
      input: z.object({ itemId: z.number(), quantity: z.number().default(1) }),
      responses: { 201: storeListItemWithItemSchema },
    },
    updateListItem: {
      method: 'PATCH' as const,
      path: '/api/stores/:storeId/list/:listItemId' as const,
      input: z.object({ quantity: z.number().min(1) }),
      responses: { 200: storeListItemWithItemSchema },
    },
    removeFromList: {
      method: 'DELETE' as const,
      path: '/api/stores/:storeId/list/:listItemId' as const,
      responses: { 204: z.void() },
    },
    reorderList: {
      method: 'POST' as const,
      path: '/api/stores/:storeId/list/reorder' as const,
      input: z.object({ orderedIds: z.array(z.number()) }),
      responses: { 200: z.object({ success: z.boolean() }) },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
