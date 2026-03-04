import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accountUsers = pgTable("account_users", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id"),
  name: text("name").notNull(),
  category: text("category"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  quantity: integer("quantity").default(1).notNull(),
  inShoppingList: boolean("in_shopping_list").default(false).notNull(),
  listOrder: integer("list_order"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id"),
  name: text("name").notNull(),
});

export const storeListItems = pgTable("store_list_items", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  listOrder: integer("list_order"),
});

export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true, accountId: true });
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true, accountId: true });
export const insertStoreListItemSchema = createInsertSchema(storeListItems).omit({ id: true });

export type Account = typeof accounts.$inferSelect;
export type AccountUser = typeof accountUsers.$inferSelect;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type UpdateItemRequest = Partial<InsertItem>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type StoreWithCount = Store & { itemCount: number };

export type StoreListItem = typeof storeListItems.$inferSelect;
export type InsertStoreListItem = z.infer<typeof insertStoreListItemSchema>;
export type StoreListItemWithItem = StoreListItem & { item: Item };
