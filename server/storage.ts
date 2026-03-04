import { db } from "./db";
import { items, stores, storeListItems, type Item, type InsertItem, type UpdateItemRequest, type Store, type StoreWithCount, type StoreListItem, type StoreListItemWithItem } from "@shared/schema";
import { eq, asc, sql } from "drizzle-orm";

export interface IStorage {
  getItems(): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, updates: UpdateItemRequest): Promise<Item | undefined>;
  deleteItem(id: number): Promise<void>;
  reorderListItems(orderedIds: number[]): Promise<void>;

  getStores(): Promise<StoreWithCount[]>;
  createStore(name: string): Promise<Store>;
  deleteStore(id: number): Promise<void>;

  getStoreList(storeId: number): Promise<StoreListItemWithItem[]>;
  addToStoreList(storeId: number, itemId: number, quantity: number): Promise<StoreListItem>;
  updateStoreListItem(id: number, updates: { quantity?: number }): Promise<StoreListItem | undefined>;
  removeFromStoreList(id: number): Promise<void>;
  reorderStoreList(storeId: number, orderedIds: number[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getItems(): Promise<Item[]> {
    return await db.select().from(items);
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(insertItem).returning();
    return item;
  }

  async updateItem(id: number, updates: UpdateItemRequest): Promise<Item | undefined> {
    const [item] = await db.update(items).set(updates).where(eq(items.id, id)).returning();
    return item;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(storeListItems).where(eq(storeListItems.itemId, id));
    await db.delete(items).where(eq(items.id, id));
  }

  async reorderListItems(orderedIds: number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(items).set({ listOrder: index }).where(eq(items.id, id))
      )
    );
  }

  async getStores(): Promise<StoreWithCount[]> {
    const rows = await db
      .select({
        id: stores.id,
        name: stores.name,
        itemCount: sql<number>`cast(count(${storeListItems.id}) as int)`,
      })
      .from(stores)
      .leftJoin(storeListItems, eq(storeListItems.storeId, stores.id))
      .groupBy(stores.id, stores.name)
      .orderBy(asc(stores.id));
    return rows;
  }

  async createStore(name: string): Promise<Store> {
    const [store] = await db.insert(stores).values({ name }).returning();
    return store;
  }

  async deleteStore(id: number): Promise<void> {
    await db.delete(storeListItems).where(eq(storeListItems.storeId, id));
    await db.delete(stores).where(eq(stores.id, id));
  }

  async getStoreList(storeId: number): Promise<StoreListItemWithItem[]> {
    const rows = await db
      .select()
      .from(storeListItems)
      .innerJoin(items, eq(storeListItems.itemId, items.id))
      .where(eq(storeListItems.storeId, storeId))
      .orderBy(asc(storeListItems.listOrder));

    return rows.map(row => ({
      ...row.store_list_items,
      item: row.items,
    }));
  }

  async addToStoreList(storeId: number, itemId: number, quantity: number): Promise<StoreListItem> {
    const existing = await db
      .select()
      .from(storeListItems)
      .where(eq(storeListItems.storeId, storeId))
      .orderBy(asc(storeListItems.listOrder));

    const currentList = existing.filter(r => r.storeId === storeId);
    const maxOrder = currentList.length > 0
      ? Math.max(...currentList.map(r => r.listOrder ?? -1))
      : -1;

    const [listItem] = await db
      .insert(storeListItems)
      .values({ storeId, itemId, quantity, listOrder: maxOrder + 1 })
      .returning();
    return listItem;
  }

  async updateStoreListItem(id: number, updates: { quantity?: number }): Promise<StoreListItem | undefined> {
    const [item] = await db
      .update(storeListItems)
      .set(updates)
      .where(eq(storeListItems.id, id))
      .returning();
    return item;
  }

  async removeFromStoreList(id: number): Promise<void> {
    await db.delete(storeListItems).where(eq(storeListItems.id, id));
  }

  async reorderStoreList(storeId: number, orderedIds: number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(storeListItems).set({ listOrder: index }).where(eq(storeListItems.id, id))
      )
    );
  }
}

export const storage = new DatabaseStorage();
