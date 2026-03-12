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

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

const STORAGE_KEY = "shopeeze_items";

/* ----------------------------- */
/* IMAGE STORAGE HELPERS         */
/* Each image stored separately  */
/* under "shopeeze_img_{id}" so  */
/* a large image never crashes   */
/* the main items store.         */
/* ----------------------------- */

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

/* ----------------------------- */
/* PROVIDER                      */
/* ----------------------------- */

export function ItemsProvider({ children }: { children: React.ReactNode }) {

  const [items, setItems] = useState<Item[]>([]);

  /* LOAD */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: Item[] = JSON.parse(saved);
        const upgraded = parsed.map((item) => ({
          ...item,
          preferredStoreId: item.preferredStoreId ?? undefined,
          category: item.category ?? "other",
          // Re-attach image from its own key (or keep inline if old format)
          imageUrl: item.imageUrl ?? loadImage(item.id),
        }));
        setItems(upgraded);
      } catch (err) {
        console.warn("Could not load items:", err);
      }
    }
  }, []);

  /* SAVE — images stored separately so large images don't crash the quota */
  useEffect(() => {
    const itemsWithoutImages = items.map(({ imageUrl, ...rest }) => rest);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsWithoutImages));
    } catch (err) {
      console.warn("Could not save items:", err);
    }
    items.forEach((item) => saveImage(item.id, item.imageUrl));
  }, [items]);

  /* ADD */
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

  /* DELETE */
  const deleteItem = (id: number) => {
    deleteImage(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  /* UPDATE */
  function updateItem(id: number, updates: Partial<Item>) {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  }

  return (
    <ItemsContext.Provider value={{ items, addItem, deleteItem, updateItem }}>
      {children}
    </ItemsContext.Provider>
  );
}

/* HOOK */
export function useItems() {
  const context = useContext(ItemsContext);
  if (!context) throw new Error("useItems must be used inside ItemsProvider");
  return context;
}