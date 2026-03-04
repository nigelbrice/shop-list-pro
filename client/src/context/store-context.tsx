import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface StoreContextValue {
  selectedStoreId: number | null;
  setSelectedStoreId: (id: number | null) => void;
}

const StoreContext = createContext<StoreContextValue>({
  selectedStoreId: null,
  setSelectedStoreId: () => {},
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [selectedStoreId, setSelectedStoreIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem("selectedStoreId");
    return stored ? parseInt(stored, 10) : null;
  });

  const setSelectedStoreId = (id: number | null) => {
    setSelectedStoreIdState(id);
    if (id == null) {
      localStorage.removeItem("selectedStoreId");
    } else {
      localStorage.setItem("selectedStoreId", String(id));
    }
  };

  return (
    <StoreContext.Provider value={{ selectedStoreId, setSelectedStoreId }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  return useContext(StoreContext);
}
