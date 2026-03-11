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

  updateItemQuantity: (
    storeId: number,
    listItemId: number,
    quantity: number
  ) => void;

  toggleItemCompleted: (
    storeId: number,
    listItemId: number
  ) => void;
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
  { value: "produce", label: "🥦 Produce" },
  { value: "bakery", label: "🍞 Bakery" },
  { value: "meat", label: "🥩 Meat" },
  { value: "dairy", label: "🥛 Dairy" },
  { value: "chilled", label: "🧊 Chilled" },
  { value: "frozen", label: "❄ Frozen" },
  { value: "pantry", label: "🥫 Pantry" },
  { value: "household", label: "🧴 Household" },
  { value: "other", label: "📦 Other" }
];

/* ------------------------------------------------ */
/* PROVIDER                                         */
/* ------------------------------------------------ */

export function StoreProvider({ children }: { children: React.ReactNode }) {

  const [stores, setStores] = useState<Store[]>([
    { id: 1, name: "Tesco", itemCount: 0 },
    { id: 2, name: "Aldi", itemCount: 0 },
    { id: 3, name: "Asda", itemCount: 0 }
  ]);

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(1);

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

  useEffect(() => {
    localStorage.setItem(
      "shopeeze_store_lists",
      JSON.stringify(storeLists)
    );
  }, [storeLists]);

  useEffect(() => {
  localStorage.setItem(
    "shopeeze_sort_aisle",
    JSON.stringify(sortByAisle)
  );
}, [sortByAisle]);


  /* ---------------- STORE ACTIONS ---------------- */

  function addStore(name: string) {

  const newStore: Store = {
    id: Date.now(),
    name,
    itemCount: 0
  };

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

        return {
          ...prev,
          [storeId]: updated
        };
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

      return {
        ...prev,
        [storeId]: [...current, newItem]
      };

    });
  }

  /* ---------------- REMOVE ITEM ---------------- */

  function removeItemFromStore(
    storeId: number,
    listItemId: number
  ) {

    setStoreLists(prev => {

      const current = prev[storeId] || [];

      return {
        ...prev,
        [storeId]: current.filter(
          item => item.id !== listItemId
        )
      };

    });
  }

  /* ---------------- UPDATE QUANTITY ---------------- */

  function updateItemQuantity(
    storeId: number,
    listItemId: number,
    quantity: number
  ) {

    setStoreLists(prev => {

      const current = prev[storeId] || [];

      const updated = current.map(item =>
        item.id === listItemId
          ? { ...item, quantity }
          : item
      );

      return {
        ...prev,
        [storeId]: updated
      };

    });
  }

  /* ---------------- TOGGLE COMPLETE ---------------- */

  function toggleItemCompleted(
    storeId: number,
    listItemId: number
  ) {

    setStoreLists(prev => {

      const current = prev[storeId] || [];

      const updated = current.map(item =>
        item.id === listItemId
          ? { ...item, completed: !item.completed }
          : item
      );

      return {
        ...prev,
        [storeId]: updated
      };

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
        toggleItemCompleted
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