import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  notes: text("notes"),
  imageUrl: text("image_url"),
  quantity: integer("quantity").default(1).notNull(),
  inShoppingList: boolean("in_shopping_list").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true });

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type UpdateItemRequest = Partial<InsertItem>;
