import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { enqueue } from "@/lib/supabase-sync";
import { categoryOptions, aisleOrder } from "@/lib/categories";
export { aisleOrder };

// =============================================
// TYPES
// =============================================

export type Store = {
  id: number;
  name: string;
  itemCount: number;
  account_id?: number;
  updated_at?: string;
};

export type StoreListItem = {
  id: number;
  quantity: number;
  completed: boolean;
  updated_at?: string;
  account_id?: number;
  added_by_user_id?: number;
  added_by_name?: string;
  item: {
    id: number;
    name: string;
    imageUrl?: string;
    category?: string;
    notes?: string;
  };
};

type StoreLists = {
  [storeId: number]: StoreListItem[];
};

type StoreContextType = {
  stores: Store[];
  selectedStoreId: number | null;
  setSelectedStoreId: (id: number | null) => void;
  storeLists: StoreLists;

  sortByAisle: boolean;
  setSortByAisle: (value: boolean) => void;

  accountId: number | null;
  setAccountId: (id: number) => void;

  addStore: (name: string) => number;
  deleteStore: (id: number) => void;

  addItemToStore: (storeId: number, item: any, addedByUserId?: number, addedByName?: string) => void;
  removeItemFromStore: (storeId: number, listItemId: number) => void;
  updateItemQuantity: (storeId: number, listItemId: number, quantity: number) => void;
  toggleItemCompleted: (storeId: number, listItemId: number) => void;
  syncItemDetails: (itemId: number, updates: { name?: string; imageUrl?: string; category?: string; notes?: string }) => void;

  // Called by useSync after pulling from Supabase
  setStores: (stores: Store[]) => void;
  setStoreListItems: (items: StoreListItem[], itemsById?: Map<number, any>) => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

// =============================================
// AISLE ORDER + CATEGORY OPTIONS
// =============================================

const DEFAULT_STORES: Store[] = [
  { id: 1, name: "Tesco", itemCount: 0 },
  { id: 2, name: "Aldi",  itemCount: 0 },
  { id: 3, name: "Asda",  itemCount: 0 },
];

// =============================================
// PROVIDER
// =============================================

export function StoreProvider({ children }: { children: React.ReactNode }) {

  const [accountId, setAccountId] = useState<number | null>(null);

  const [stores, setStoresState] = useState<Store[]>(() => {
    try {
      const saved = localStorage.getItem("shopeeze_stores");
      return saved ? JSON.parse(saved) : DEFAULT_STORES;
    } catch {
      return DEFAULT_STORES;
    }
  });

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem("shopeeze_selected_store");
      return saved ? JSON.parse(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [sortByAisle, setSortByAisle] = useState(() => {
    const saved = localStorage.getItem("shopeeze_sort_aisle");
    return saved ? JSON.parse(saved) : false;
  });

  const [storeLists, setStoreListsState] = useState<StoreLists>(() => {
    try {
      const saved = localStorage.getItem("shopeeze_store_lists");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // -----------------------------------------------
  // PERSIST to localStorage
  // -----------------------------------------------

  useEffect(() => {
    localStorage.setItem("shopeeze_stores", JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem("shopeeze_selected_store", JSON.stringify(selectedStoreId));
  }, [selectedStoreId]);

  useEffect(() => {
    try {
      localStorage.setItem("shopeeze_store_lists", JSON.stringify(storeLists));
    } catch (err) {
      console.warn("Could not save store lists (storage full?):", err);
    }
  }, [storeLists]);

  useEffect(() => {
    localStorage.setItem("shopeeze_sort_aisle", JSON.stringify(sortByAisle));
  }, [sortByAisle]);

  // -----------------------------------------------
  // setStores — called by useSync after a pull.
  // Merges remote stores into local state.
  // -----------------------------------------------
  const setStores = useCallback((incoming: Store[]) => {
    setStoresState(incoming);
  }, []);

  // -----------------------------------------------
  // setStoreListItems — called by useSync after a pull.
  // Supabase stores list items as flat rows, but
  // locally we group them by storeId. This converts
  // the flat array back into the grouped shape.
  // -----------------------------------------------
  const setStoreListItems = useCallback((incoming: StoreListItem[], itemsById?: Map<number, any>) => {
    setStoreListsState((prev) => {
      // Build a flat map of existing list items so we can
      // fall back to local snapshots if itemsById doesn't have it.
      const existingMap = new Map<number, StoreListItem>();
      for (const storeId in prev) {
        for (const li of prev[storeId]) {
          existingMap.set(li.id, li);
        }
      }

      // Regroup flat rows by store_id, re-attaching item snapshots.
      const grouped: StoreLists = {};
      for (const row of incoming) {
        const storeId = (row as any).store_id;
        if (!storeId) continue;
        if (!grouped[storeId]) grouped[storeId] = [];

        const existing = existingMap.get(row.id);
        const itemId = Number((row as any).item_id ?? existing?.item?.id);

        // Prefer: fully synced items table → local snapshot → fallback
        const itemDetail = itemsById?.get(itemId);
        const item = itemDetail
          ? { id: itemId, name: itemDetail.name, category: itemDetail.category, notes: itemDetail.notes, imageUrl: existing?.item?.imageUrl ?? itemDetail.imageUrl }
          : existing?.item
          ?? { id: itemId, name: "Unknown" };

        grouped[storeId].push({ ...row, item });
      }

      // Trust Supabase as the source of truth — if a store's list
      // is empty or missing from the remote pull, that means all
      // its items have been deleted. Do NOT fall back to local state
      // or deleted items will never disappear on other devices.
      return grouped;
    });
  }, []);

  // -----------------------------------------------
  // ADD STORE
  // -----------------------------------------------
  const addStore = useCallback((name: string) => {
    const now = new Date().toISOString();
    const newStore: Store = {
      id: Date.now(),
      name: name.trim().replace(/\b\w/g, c => c.toUpperCase()),
      itemCount: 0,
      account_id: accountId ?? undefined,
      updated_at: now,
    };

    setStoresState((prev) => [...prev, newStore]);

    if (accountId) {
      enqueue({
        table: "stores",
        action: "upsert",
        accountId,
        payload: {
          id: newStore.id,
          account_id: accountId,
          name,
          updated_at: now,
        },
      });
    }

    return newStore.id;
  }, [accountId]);

  // -----------------------------------------------
  // DELETE STORE
  // -----------------------------------------------
  const deleteStore = useCallback((id: number) => {
    setStoresState((prev) => prev.filter((s) => s.id !== id));
    setStoreListsState((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    if (selectedStoreId === id) setSelectedStoreId(null);

    if (accountId) {
      enqueue({
        table: "stores",
        action: "delete",
        accountId,
        payload: { id },
      });
    }
  }, [accountId, selectedStoreId]);

  // -----------------------------------------------
  // ADD ITEM TO STORE
  // -----------------------------------------------
  const addItemToStore = useCallback((storeId: number, item: any, addedByUserId?: number, addedByName?: string) => {
    const now = new Date().toISOString();

    setStoreListsState((prev) => {
      const current = prev[storeId] || [];
      const existingIndex = current.findIndex((li) => li.item.id === item.id);

      if (existingIndex !== -1) {
        // Item already in list — just bump the quantity
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
          updated_at: now,
        };

        if (accountId) {
          enqueue({
            table: "store_list_items",
            action: "upsert",
            accountId,
            payload: {
              id: updated[existingIndex].id,
              account_id: accountId,
              store_id: storeId,
              item_id: item.id,
              quantity: updated[existingIndex].quantity,
              completed: updated[existingIndex].completed,
              added_by_user_id: updated[existingIndex].added_by_user_id,
              added_by_name: updated[existingIndex].added_by_name,
              updated_at: now,
            },
          });
        }

        return { ...prev, [storeId]: updated };
      }

      // New entry
      const newListItem: StoreListItem = {
        id: Date.now(),
        quantity: 1,
        completed: false,
        updated_at: now,
        account_id: accountId ?? undefined,
        added_by_user_id: addedByUserId,
        added_by_name: addedByName,
        item: {
          id: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          category: item.category,
          notes: item.notes,
        },
      };

      if (accountId) {
        enqueue({
          table: "store_list_items",
          action: "upsert",
          accountId,
          payload: {
            id: newListItem.id,
            account_id: accountId,
            store_id: storeId,
            item_id: item.id,
            quantity: 1,
            completed: false,
            added_by_user_id: addedByUserId ?? null,
            added_by_name: addedByName ?? null,
            updated_at: now,
          },
        });
      }

      return { ...prev, [storeId]: [...current, newListItem] };
    });
  }, [accountId]);

  // -----------------------------------------------
  // REMOVE ITEM FROM STORE
  // -----------------------------------------------
  const removeItemFromStore = useCallback((storeId: number, listItemId: number) => {
    setStoreListsState((prev) => ({
      ...prev,
      [storeId]: (prev[storeId] || []).filter((item) => item.id !== listItemId),
    }));

    if (accountId) {
      enqueue({
        table: "store_list_items",
        action: "delete",
        accountId,
        payload: { id: listItemId },
      });
    }
  }, [accountId]);

  // -----------------------------------------------
  // UPDATE QUANTITY
  // -----------------------------------------------
  const updateItemQuantity = useCallback((
    storeId: number,
    listItemId: number,
    quantity: number
  ) => {
    if (quantity < 1) return;
    const now = new Date().toISOString();

    setStoreListsState((prev) => {
      const updated = (prev[storeId] || []).map((item) =>
        item.id === listItemId ? { ...item, quantity, updated_at: now } : item
      );

      const listItem = updated.find((i) => i.id === listItemId);
      if (accountId && listItem) {
        enqueue({
          table: "store_list_items",
          action: "upsert",
          accountId,
          payload: {
            id: listItemId,
            account_id: accountId,
            store_id: storeId,
            item_id: listItem.item.id,
            quantity,
            completed: listItem.completed,
            updated_at: now,
          },
        });
      }

      return { ...prev, [storeId]: updated };
    });
  }, [accountId]);

  // -----------------------------------------------
  // TOGGLE COMPLETED
  // -----------------------------------------------
  const toggleItemCompleted = useCallback((storeId: number, listItemId: number) => {
    const now = new Date().toISOString();

    setStoreListsState((prev) => {
      const updated = (prev[storeId] || []).map((item) =>
        item.id === listItemId
          ? { ...item, completed: !item.completed, updated_at: now }
          : item
      );

      const listItem = updated.find((i) => i.id === listItemId);
      if (accountId && listItem) {
        enqueue({
          table: "store_list_items",
          action: "upsert",
          accountId,
          payload: {
            id: listItemId,
            account_id: accountId,
            store_id: storeId,
            item_id: listItem.item.id,
            quantity: listItem.quantity,
            completed: listItem.completed,
            updated_at: now,
          },
        });
      }

      return { ...prev, [storeId]: updated };
    });
  }, [accountId]);

  // -----------------------------------------------
  // SYNC ITEM DETAILS
  // When an item is edited in the Database page,
  // update its snapshot in every store list.
  // -----------------------------------------------
  const syncItemDetails = useCallback((
    itemId: number,
    updates: { name?: string; imageUrl?: string; category?: string; notes?: string }
  ) => {
    setStoreListsState((prev) => {
      const next = { ...prev };
      for (const storeId in next) {
        next[storeId] = next[storeId].map((listItem) =>
          listItem.item.id === itemId
            ? { ...listItem, item: { ...listItem.item, ...updates } }
            : listItem
        );
      }
      return next;
    });
  }, []);

  return (
    <StoreContext.Provider value={{
      stores,
      selectedStoreId,
      setSelectedStoreId,
      storeLists,
      sortByAisle,
      setSortByAisle,
      accountId,
      setAccountId,
      addStore,
      deleteStore,
      addItemToStore,
      removeItemFromStore,
      updateItemQuantity,
      toggleItemCompleted,
      syncItemDetails,
      setStores,
      setStoreListItems,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

// =============================================
// HOOK
// =============================================

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStoreContext must be used inside StoreProvider");
  return context;
}