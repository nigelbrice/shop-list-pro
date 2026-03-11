import { openDB } from "idb";

const DB_NAME = "shopping-sync";
const STORE_NAME = "queue";

export interface SyncEvent {
  id: string;
  type: "ADD" | "UPDATE" | "DELETE";
  payload: any;
}

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
}

export async function addToQueue(event: SyncEvent) {
  const db = await getDB();
  await db.put(STORE_NAME, event);
}

export async function getQueue(): Promise<SyncEvent[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function removeFromQueue(id: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}