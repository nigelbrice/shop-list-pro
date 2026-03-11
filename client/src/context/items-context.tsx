import { createContext, useContext, useEffect, useState } from "react";

/* ----------------------------- */
/* ITEM TYPE                     */
/* ----------------------------- */

type Item = {
  id: number;
  name: string;
  category?: string;
  notes?: string;
  imageUrl?: string;
  preferredStoreId?: number;
  createdAt?: string;
};

/* ----------------------------- */
/* CONTEXT TYPE                  */
/* ----------------------------- */

type ItemsContextType = {
  items: Item[];
  addItem: (
  name: string,
  category?: string,
  imageUrl?: string,
  preferredStoreId?: number
) => void;
  deleteItem: (id: number) => void;
  updateItem: (id: number, updates: Partial<Item>) => void;
};

/* ----------------------------- */
/* CONTEXT SETUP                 */
/* ----------------------------- */

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

const STORAGE_KEY = "shopeeze_items";

/* ----------------------------- */
/* PROVIDER                      */
/* ----------------------------- */

export function ItemsProvider({ children }: { children: React.ReactNode }) {

  const [items, setItems] = useState<Item[]>([]);

  /* ----------------------------- */
  /* LOAD ITEMS FROM STORAGE       */
  /* ----------------------------- */

  useEffect(() => {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {

      const parsed: Item[] = JSON.parse(saved);

      // upgrade old items if needed
      const upgraded = parsed.map((item) => ({
  ...item,
  preferredStoreId: item.preferredStoreId ?? undefined,
  category: item.category ?? "other"
}));

      setItems(upgraded);

    }

  }, []);

  /* ----------------------------- */
  /* SAVE ITEMS TO STORAGE         */
  /* ----------------------------- */

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  /* ----------------------------- */
  /* ADD ITEM                      */
  /* ----------------------------- */

  const addItem = (
  name: string,
  category?: string,
  imageUrl?: string,
  preferredStoreId?: number
) => {

  const newItem: Item = {
    id: Date.now(),
    name,
    category,
    imageUrl,
    preferredStoreId,
    createdAt: new Date().toISOString(),
  };

  setItems((prev) => [...prev, newItem]);

};

  /* ----------------------------- */
  /* DELETE ITEM                   */
  /* ----------------------------- */

  const deleteItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

function updateItem(id: number, updates: Partial<Item>) {
  setItems(prev =>
    prev.map(item =>
      item.id === id
        ? { ...item, ...updates }
        : item
    )
  );
}

  /* ----------------------------- */
  /* PROVIDER                      */
  /* ----------------------------- */

  return (
    <ItemsContext.Provider
  value={{
    items,
    addItem,
    deleteItem,
    updateItem
  }}
>
      {children}
    </ItemsContext.Provider>
  );
}

/* ----------------------------- */
/* HOOK                          */
/* ----------------------------- */

export function useItems() {

  const context = useContext(ItemsContext);

  if (!context) {
    throw new Error("useItems must be used inside ItemsProvider");
  }

  return context;

}