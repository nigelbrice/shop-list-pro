const DB_NAME = "shopeeze-db";
const DB_VERSION = 1;

const STORES = {
  ITEMS: "items"
};

export interface LocalItem {
  id: string;
  name: string;
  listId?: string;
  completed?: boolean;
  synced: boolean;
  updatedAt: number;
}

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORES.ITEMS)) {
        const store = database.createObjectStore(STORES.ITEMS, {
          keyPath: "id"
        });

        store.createIndex("synced", "synced", { unique: false });
        store.createIndex("listId", "listId", { unique: false });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

async function getStore(mode: IDBTransactionMode) {
  const database = await openDB();
  const tx = database.transaction(STORES.ITEMS, mode);
  return tx.objectStore(STORES.ITEMS);
}

export async function saveItem(item: Partial<LocalItem>) {
  const store = await getStore("readwrite");
  console.log("Saving item locally:", record);
  const record: LocalItem = {
    id: item.id ?? crypto.randomUUID(),
    name: item.name ?? "",
    listId: item.listId,
    completed: item.completed ?? false,
    synced: navigator.onLine,
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

export async function getItems(): Promise<LocalItem[]> {
  const store = await getStore("readonly");

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateItem(id: string, updates: Partial<LocalItem>) {
  const store = await getStore("readwrite");

  const existing = await new Promise<LocalItem>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const updated = {
    ...existing,
    ...updates,
    synced: navigator.onLine,
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const req = store.put(updated);

    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteItem(id: string) {
  const store = await getStore("readwrite");

  return new Promise((resolve, reject) => {
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getUnsyncedItems(): Promise<LocalItem[]> {
  const store = await getStore("readonly");
  const index = store.index("synced");

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(false));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function markItemSynced(id: string) {
  const store = await getStore("readwrite");

  const item = await new Promise<LocalItem>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!item) return;

  item.synced = true;

  return new Promise((resolve, reject) => {
    const req = store.put(item);

    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}
export async function updateLocalItem(id: number, updates: Partial<any>) {
  const items = await getItems();

  const item = items.find((i) => i.id === id);
  if (!item) return;

  const updated = {
    ...item,
    ...updates,
    synced: false,
    updatedAt: Date.now(),
  };

  await saveItem(updated);

  return updated;
}

export async function deleteLocalItem(id: number) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}