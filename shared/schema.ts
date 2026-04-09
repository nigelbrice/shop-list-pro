import { pgTable, text, serial, boolean, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
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
  defaultStoreId: integer("default_store_id"),
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

// server/db/schema.ts
// Add this to your existing schema file alongside your Shopeeze tables

import { pgTable, bigserial, bigint, text, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';

export const recipes = pgTable('recipes', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  accountId: bigint('account_id', { mode: 'bigint' }).notNull(),
  createdByUserId: bigint('created_by_user_id', { mode: 'bigint' }).notNull(),
  
  // Basic info
  title: text('title').notNull(),
  category: text('category'),
  sourceUrl: text('source_url'),
  imageUrl: text('image_url'),
  
  // Recipe content
  ingredients: jsonb('ingredients').notNull().default([]),
  baseInstructions: jsonb('base_instructions').notNull().default([]),
  cookingMethods: jsonb('cooking_methods').default([]),
  
  // Metadata
  prepTime: text('prep_time'),
  servings: text('servings'),
  tags: jsonb('tags').default([]),
  
  // User additions
  notes: text('notes'),
  rating: integer('rating'), // 1-5
  
  // Nutrition data (per 100g)
  caloriesPer100g: real('calories_per_100g'),
  proteinPer100g: real('protein_per_100g'), // in grams
  fatPer100g: real('fat_per_100g'), // in grams
  carbsPer100g: real('carbs_per_100g'), // in grams
  
  // Nutrition data (per serving)
  caloriesPerServing: real('calories_per_serving'),
  proteinPerServing: real('protein_per_serving'), // in grams
  fatPerServing: real('fat_per_serving'), // in grams
  carbsPerServing: real('carbs_per_serving'), // in grams
  
  // Nutrition metadata
  totalWeight: real('total_weight'), // total recipe weight in grams
  calculatedAt: timestamp('calculated_at', { withTimezone: true }),
  nutritionBreakdown: jsonb('nutrition_breakdown'), // ingredient breakdown with sources
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// TypeScript types
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

// Example of structured data types for JSONB fields:
export interface RecipeIngredient {
  item: string;
  amount: string;
  unit: string;
  notes?: string;
}

export interface RecipeStep {
  step: number;
  text: string;
}

export interface CookingMethod {
  method: string; // "Oven", "Slow Cooker", "Smoker", etc.
  temp: string;
  time: string;
  instructions: RecipeStep[];
}

export interface NutritionData {
  per100g: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  perServing: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  totalWeight: number; // in grams
  calculatedAt: Date;
}

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