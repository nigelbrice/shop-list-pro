import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { enqueue } from "@/lib/supabase-sync";
import { generateTempId } from "@/lib/idGenerator";


// =============================================
// TYPES
// =============================================

export type Item = {
  id: number;
  name: string;
  category?: string;
  notes?: string;
  imageUrl?: string;
  preferredStoreId?: number;
  createdAt?: string;
  updated_at?: string;  // needed for merge conflict resolution
  account_id?: number;  // needed so Supabase knows which account owns it
};

type ItemsContextType = {
  items: Item[];
  accountId: number | null;
  setAccountId: (id: number) => void;
  addItem: (
    name: string,
    category?: string,
    imageUrl?: string,
    preferredStoreId?: number
  ) => void;
  deleteItem: (id: number) => void;
  updateItem: (id: number, updates: Partial<Item>) => void;
  setItems: (items: Item[]) => void;  // used by useSync to merge remote data in
};

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

const STORAGE_KEY = "shopeeze_items";

// =============================================
// IMAGE STORAGE HELPERS
// Images are stored separately under
// "shopeeze_img_{id}" so a large image never
// crashes the main items store quota.
// =============================================

function saveImage(id: number, imageUrl: string | undefined) {
  if (!imageUrl) {
    localStorage.removeItem(`shopeeze_img_${id}`);
    return;
  }
  try {
    localStorage.setItem(`shopeeze_img_${id}`, imageUrl);
  } catch (err) {
    console.warn(`Could not save image for item ${id} (storage full?):`, err);
  }
}

function loadImage(id: number): string | undefined {
  return localStorage.getItem(`shopeeze_img_${id}`) ?? undefined;
}

function deleteImage(id: number) {
  localStorage.removeItem(`shopeeze_img_${id}`);
}

// =============================================
// PROVIDER
// =============================================

export function ItemsProvider({ children }: { children: React.ReactNode }) {

  const [items, setItemsState] = useState<Item[]>([]);

  // accountId is set once auth loads — we need it
  // to tag every Supabase row with the right account.
  const [accountId, setAccountId] = useState<number | null>(null);

  // -----------------------------------------------
  // LOAD from localStorage on first mount
  // -----------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: Item[] = JSON.parse(saved);
        const upgraded = parsed.map((item) => ({
          ...item,
          preferredStoreId: item.preferredStoreId ?? undefined,
          category: item.category ?? "other",
          imageUrl: item.imageUrl ?? loadImage(item.id),
        }));
        setItemsState(upgraded);
      } catch (err) {
        console.warn("Could not load items:", err);
      }
    }
  }, []);

  // -----------------------------------------------
  // SAVE to localStorage whenever items change.
  // Images are stored separately to avoid quota
  // errors with large base64 strings.
  // Only save an image when we actually have one —
  // never remove an existing image just because the
  // current state has imageUrl undefined (e.g. after
  // a Supabase sync where images aren't stored).
  // -----------------------------------------------
  useEffect(() => {
    const itemsWithoutImages = items.map(({ imageUrl, ...rest }) => rest);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsWithoutImages));
    } catch (err) {
      console.warn("Could not save items:", err);
    }
    items.forEach((item) => {
      if (item.imageUrl) saveImage(item.id, item.imageUrl);
    });
  }, [items]);

  // -----------------------------------------------
  // setItems — called by useSync after a pull.
  // Reattaches images (which aren't stored in
  // Supabase) to any remote rows that came in.
  // -----------------------------------------------
  
  const setItems = useCallback((incoming: Item[]) => {
    // console.log("[diag] setItems incoming:", JSON.stringify(incoming.slice(0,3)));
    setItemsState((prev) => {
      // Build a map of existing images by id
      const imageMap = new Map(prev.map((i) => [i.id, i.imageUrl]));
      return incoming.map((item: any) => ({
        ...item,
        // Supabase returns snake_case — map back to camelCase
        preferredStoreId: item.preferredStoreId ?? (item.preferred_store ? Number(item.preferred_store) : undefined),
        imageUrl: item.imageUrl ?? imageMap.get(item.id) ?? loadImage(item.id),
      }));
    });
  }, []);

  // -----------------------------------------------
  // ADD
  // -----------------------------------------------
  const addItem = useCallback((
    name: string,
    category?: string,
    imageUrl?: string,
    preferredStoreId?: number
  ) => {
    const now = new Date().toISOString();
    const newItem: Item = {
      id: generateTempId(),
      name: name.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
      category,
      imageUrl,
      preferredStoreId,
      createdAt: now,
      updated_at: now,
      account_id: accountId ?? undefined,
    };

    setItemsState((prev) => [...prev, newItem]);

    // Queue for Supabase — will send now if online,
    // or on next reconnect if offline.
    if (accountId) {
      enqueue({
        table: "items",
        action: "upsert",
        accountId,
        payload: {
          id: newItem.id,
          account_id: accountId,
          name: newItem.name,
          category: newItem.category,
          notes: newItem.notes,
          preferred_store: preferredStoreId ?? null,
          created_at: now,
          updated_at: now,
        },
      });
    }
  }, [accountId]);

  // -----------------------------------------------
  // DELETE
  // -----------------------------------------------
  const deleteItem = useCallback((id: number) => {
    deleteImage(id);
    setItemsState((prev) => prev.filter((i) => i.id !== id));

    if (accountId) {
      enqueue({
        table: "items",
        action: "delete",
        accountId,
        payload: { id },
      });
    }
  }, [accountId]);

  // -----------------------------------------------
  // UPDATE
  // -----------------------------------------------
  const updateItem = useCallback((id: number, updates: Partial<Item>) => {
    const now = new Date().toISOString();

    setItemsState((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, updated_at: now } : item
      )
    );

    if (accountId) {
      setItemsState((prev) => {
        const current = prev.find((i) => i.id === id);
        if (!current) return prev;
        const merged = { ...current, ...updates };
        enqueue({
          table: "items",
          action: "upsert",
          accountId,
          payload: {
            id,
            account_id: accountId,
            name: merged.name,
            category: merged.category,
            notes: merged.notes,
            preferred_store: merged.preferredStoreId ?? null,
            updated_at: now,
          },
        });
        return prev;
      });
    }
  }, [accountId]);

  return (
    <ItemsContext.Provider value={{
      items,
      accountId,
      setAccountId,
      addItem,
      deleteItem,
      updateItem,
      setItems,
    }}>
      {children}
    </ItemsContext.Provider>
  );
}

// =============================================
// HOOK
// =============================================

export function useItems() {
  const context = useContext(ItemsContext);
  if (!context) throw new Error("useItems must be used inside ItemsProvider");
  return context;
}