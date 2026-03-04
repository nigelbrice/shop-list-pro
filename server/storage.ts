import { db } from "./db";
import {
  accounts, accountUsers, items, stores, storeListItems,
  type Account, type AccountUser, type Item, type InsertItem, type UpdateItemRequest,
  type Store, type StoreWithCount, type StoreListItem, type StoreListItemWithItem,
} from "@shared/schema";
import { eq, asc, sql, isNull, or } from "drizzle-orm";

export interface IStorage {
  findAccountByName(name: string): Promise<Account | undefined>;
  findAccountById(id: number): Promise<Account | undefined>;
  createAccount(name: string, passwordHash: string): Promise<Account>;
  getAccountUsers(accountId: number): Promise<AccountUser[]>;
  createAccountUser(accountId: number, name: string): Promise<AccountUser>;
  deleteAccountUser(id: number): Promise<void>;
  getAccountUserCount(accountId: number): Promise<number>;

  getItems(accountId: number): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem, accountId: number): Promise<Item>;
  updateItem(id: number, updates: UpdateItemRequest): Promise<Item | undefined>;
  deleteItem(id: number): Promise<void>;
  reorderListItems(orderedIds: number[]): Promise<void>;

  getStores(accountId: number): Promise<StoreWithCount[]>;
  createStore(name: string, accountId: number): Promise<Store>;
  deleteStore(id: number): Promise<void>;

  getStoreList(storeId: number): Promise<StoreListItemWithItem[]>;
  addToStoreList(storeId: number, itemId: number, quantity: number): Promise<StoreListItem>;
  updateStoreListItem(id: number, updates: { quantity?: number }): Promise<StoreListItem | undefined>;
  removeFromStoreList(id: number): Promise<void>;
  reorderStoreList(storeId: number, orderedIds: number[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async findAccountByName(name: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.name, name));
    return account;
  }

  async findAccountById(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async createAccount(name: string, passwordHash: string): Promise<Account> {
    const [account] = await db.insert(accounts).values({ name, passwordHash }).returning();
    return account;
  }

  async getAccountUsers(accountId: number): Promise<AccountUser[]> {
    return await db.select().from(accountUsers).where(eq(accountUsers.accountId, accountId)).orderBy(asc(accountUsers.createdAt));
  }

  async createAccountUser(accountId: number, name: string): Promise<AccountUser> {
    const [user] = await db.insert(accountUsers).values({ accountId, name }).returning();
    return user;
  }

  async deleteAccountUser(id: number): Promise<void> {
    await db.delete(accountUsers).where(eq(accountUsers.id, id));
  }

  async getAccountUserCount(accountId: number): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(accountUsers)
      .where(eq(accountUsers.accountId, accountId));
    return row?.count ?? 0;
  }

  async getItems(accountId: number): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.accountId, accountId));
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(insertItem: InsertItem, accountId: number): Promise<Item> {
    const [item] = await db.insert(items).values({ ...insertItem, accountId }).returning();
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

  async getStores(accountId: number): Promise<StoreWithCount[]> {
    const rows = await db
      .select({
        id: stores.id,
        accountId: stores.accountId,
        name: stores.name,
        itemCount: sql<number>`cast(count(${storeListItems.id}) as int)`,
      })
      .from(stores)
      .leftJoin(storeListItems, eq(storeListItems.storeId, stores.id))
      .where(eq(stores.accountId, accountId))
      .groupBy(stores.id, stores.name, stores.accountId)
      .orderBy(asc(stores.id));
    return rows;
  }

  async createStore(name: string, accountId: number): Promise<Store> {
    const [store] = await db.insert(stores).values({ name, accountId }).returning();
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

    const maxOrder = existing.length > 0
      ? Math.max(...existing.map(r => r.listOrder ?? -1))
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

export async function migrateOrphanedData() {
  try {
    const bcrypt = await import("bcryptjs");
    const orphanedItems = await db.select({ id: items.id }).from(items).where(isNull(items.accountId)).limit(1);
    const orphanedStores = await db.select({ id: stores.id }).from(stores).where(isNull(stores.accountId)).limit(1);
    if (orphanedItems.length === 0 && orphanedStores.length === 0) return;

    let demoAccount = await storage.findAccountByName("Demo");
    if (!demoAccount) {
      const passwordHash = await bcrypt.hash("demo123", 10);
      demoAccount = await storage.createAccount("Demo", passwordHash);
      await storage.createAccountUser(demoAccount.id, "Owner");
    }
    await db.update(items).set({ accountId: demoAccount.id }).where(isNull(items.accountId));
    await db.update(stores).set({ accountId: demoAccount.id }).where(isNull(stores.accountId));
    console.log(`Migrated orphaned data to Demo account (id=${demoAccount.id}). Login: name="Demo", password="demo123"`);
  } catch (err) {
    console.error("Migration failed:", err);
  }
}
