import { createContext, useContext, useState, useEffect } from "react";


/* ------------------------------------------------ */
/* TYPES                                            */
/* ------------------------------------------------ */

type Store = {
  id: number;
  name: string;
  itemCount: number;
};

type StoreListItem = {
  id: number;
  quantity: number;
  completed: boolean;
  item: {
    id: number;
    name: string;
    imageUrl?: string;
    category?: string;
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

  addStore: (name: string) => number;
  deleteStore: (id: number) => void;

  addItemToStore: (storeId: number, item: any) => void;
  removeItemFromStore: (storeId: number, listItemId: number) => void;

  updateItemQuantity: (storeId: number, listItemId: number, quantity: number) => void;
  toggleItemCompleted: (storeId: number, listItemId: number) => void;

  syncItemDetails: (itemId: number, updates: { name?: string; imageUrl?: string; category?: string }) => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

/* ------------------------------------------------ */
/* AISLE ORDER                                      */
/* ------------------------------------------------ */

export const aisleOrder: string[] = [
  "produce",
  "bakery",
  "meat",
  "dairy",
  "chilled",
  "frozen",
  "pantry",
  "household",
  "other"
];

/* ------------------------------------------------ */
/* CATEGORY OPTIONS                                 */
/* ------------------------------------------------ */

export const categoryOptions = [
  { value: "produce",   label: "🥦 Produce" },
  { value: "bakery",    label: "🍞 Bakery" },
  { value: "meat",      label: "🥩 Meat" },
  { value: "dairy",     label: "🥛 Dairy" },
  { value: "chilled",   label: "🧊 Chilled" },
  { value: "frozen",    label: "❄ Frozen" },
  { value: "pantry",    label: "🥫 Pantry" },
  { value: "household", label: "🧴 Household" },
  { value: "other",     label: "📦 Other" }
];

/* ------------------------------------------------ */
/* DEFAULT STORES — only used if nothing is saved   */
/* ------------------------------------------------ */

const DEFAULT_STORES: Store[] = [
  { id: 1, name: "Tesco", itemCount: 0 },
  { id: 2, name: "Aldi",  itemCount: 0 },
  { id: 3, name: "Asda",  itemCount: 0 }
];

/* ------------------------------------------------ */
/* PROVIDER                                         */
/* ------------------------------------------------ */

export function StoreProvider({ children }: { children: React.ReactNode }) {

  // FIX 2: Load stores from localStorage so they survive a page refresh.
  // Falls back to DEFAULT_STORES only on first ever visit.
  const [stores, setStores] = useState<Store[]>(() => {
    try {
      const saved = localStorage.getItem("shopeeze_stores");
      return saved ? JSON.parse(saved) : DEFAULT_STORES;
    } catch {
      return DEFAULT_STORES;
    }
  });

  // FIX 2: Also persist selectedStoreId across refreshes.
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

  const [storeLists, setStoreLists] = useState<StoreLists>(() => {
    try {
      const saved = localStorage.getItem("shopeeze_store_lists");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // FIX 2: Save stores whenever they change.
  useEffect(() => {
    localStorage.setItem("shopeeze_stores", JSON.stringify(stores));
  }, [stores]);

  // FIX 2: Save selected store whenever it changes.
  useEffect(() => {
    localStorage.setItem("shopeeze_selected_store", JSON.stringify(selectedStoreId));
  }, [selectedStoreId]);

  useEffect(() => {
    localStorage.setItem("shopeeze_store_lists", JSON.stringify(storeLists));
  }, [storeLists]);

  useEffect(() => {
    localStorage.setItem("shopeeze_sort_aisle", JSON.stringify(sortByAisle));
  }, [sortByAisle]);


  /* ---------------- STORE ACTIONS ---------------- */

  function addStore(name: string) {
    const newStore: Store = { id: Date.now(), name, itemCount: 0 };
    setStores(prev => [...prev, newStore]);
    return newStore.id;
  }

  function deleteStore(id: number) {
    setStores(prev => prev.filter(s => s.id !== id));
    setStoreLists(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    if (selectedStoreId === id) {
      setSelectedStoreId(null);
    }
  }

  /* ---------------- ADD ITEM ---------------- */

  function addItemToStore(storeId: number, item: any) {
    setStoreLists(prev => {
      const current = prev[storeId] || [];
      const existingIndex = current.findIndex(
        listItem => listItem.item.id === item.id
      );

      if (existingIndex !== -1) {
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return { ...prev, [storeId]: updated };
      }

      const newItem: StoreListItem = {
        id: Date.now(),
        quantity: 1,
        completed: false,
        item: {
          id: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          category: item.category
        }
      };

      return { ...prev, [storeId]: [...current, newItem] };
    });
  }

  /* ---------------- REMOVE ITEM ---------------- */

  function removeItemFromStore(storeId: number, listItemId: number) {
    setStoreLists(prev => ({
      ...prev,
      [storeId]: (prev[storeId] || []).filter(item => item.id !== listItemId)
    }));
  }

  /* ---------------- UPDATE QUANTITY ---------------- */

  // FIX 3: Quantity can't go below 1. If user taps minus at 1, remove the item instead.
  function updateItemQuantity(storeId: number, listItemId: number, quantity: number) {
    if (quantity < 1) {
      removeItemFromStore(storeId, listItemId);
      return;
    }

    setStoreLists(prev => ({
      ...prev,
      [storeId]: (prev[storeId] || []).map(item =>
        item.id === listItemId ? { ...item, quantity } : item
      )
    }));
  }

  /* ---------------- TOGGLE COMPLETE ---------------- */

  function toggleItemCompleted(storeId: number, listItemId: number) {
    setStoreLists(prev => ({
      ...prev,
      [storeId]: (prev[storeId] || []).map(item =>
        item.id === listItemId ? { ...item, completed: !item.completed } : item
      )
    }));
  }

  /* ---------------- SYNC ITEM DETAILS ---------------- */

  // FIX 4: When an item is edited in the Database, update its snapshot
  // in every store list so the shopping list stays in sync.
  function syncItemDetails(
    itemId: number,
    updates: { name?: string; imageUrl?: string; category?: string }
  ) {
    setStoreLists(prev => {
      const next = { ...prev };
      for (const storeId in next) {
        next[storeId] = next[storeId].map(listItem =>
          listItem.item.id === itemId
            ? { ...listItem, item: { ...listItem.item, ...updates } }
            : listItem
        );
      }
      return next;
    });
  }

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStoreId,
        setSelectedStoreId,
        storeLists,

        sortByAisle,
        setSortByAisle,

        addStore,
        deleteStore,
        addItemToStore,
        removeItemFromStore,
        updateItemQuantity,
        toggleItemCompleted,
        syncItemDetails,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

/* ------------------------------------------------ */
/* HOOK                                             */
/* ------------------------------------------------ */

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStoreContext must be used inside StoreProvider");
  }
  return context;
}
