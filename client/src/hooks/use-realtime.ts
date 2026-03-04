import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Item, StoreListItemWithItem, StoreWithCount } from "@shared/schema";

interface PresenceData { count: number }

export function useRealtime(onPresenceChange: (count: number) => void) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/events");
    esRef.current = es;

    es.addEventListener("presence", (e) => {
      const data: PresenceData = JSON.parse(e.data);
      onPresenceChange(data.count);
    });

    es.addEventListener("item:created", (e) => {
      const newItem: Item = JSON.parse(e.data);
      queryClient.setQueryData<Item[]>([api.items.list.path], (old) => {
        if (!old) return [newItem];
        if (old.some((i) => i.id === newItem.id)) return old;
        return [...old, newItem];
      });
    });

    es.addEventListener("item:updated", (e) => {
      const updatedItem: Item = JSON.parse(e.data);
      queryClient.setQueryData<Item[]>([api.items.list.path], (old) => {
        if (!old) return old;
        return old.map((item) => item.id === updatedItem.id ? updatedItem : item);
      });
    });

    es.addEventListener("item:deleted", (e) => {
      const { id }: { id: number } = JSON.parse(e.data);
      queryClient.setQueryData<Item[]>([api.items.list.path], (old) => {
        if (!old) return old;
        return old.filter((item) => item.id !== id);
      });
    });

    es.addEventListener("item:reordered", () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
    });

    es.addEventListener("store:created", (e) => {
      const store: StoreWithCount = JSON.parse(e.data);
      queryClient.setQueryData<StoreWithCount[]>([api.stores.list.path], (old) => {
        if (!old) return [{ ...store, itemCount: 0 }];
        if (old.some(s => s.id === store.id)) return old;
        return [...old, { ...store, itemCount: 0 }];
      });
    });

    es.addEventListener("store:deleted", (e) => {
      const { id }: { id: number } = JSON.parse(e.data);
      queryClient.setQueryData<StoreWithCount[]>([api.stores.list.path], (old) => {
        if (!old) return old;
        return old.filter(s => s.id !== id);
      });
      queryClient.removeQueries({ queryKey: [api.stores.getList.path, id] });
    });

    es.addEventListener("store:list:added", (e) => {
      const listItem: StoreListItemWithItem = JSON.parse(e.data);
      queryClient.setQueryData<StoreListItemWithItem[]>(
        [api.stores.getList.path, listItem.storeId],
        (old) => {
          if (!old) return [listItem];
          if (old.some(i => i.id === listItem.id)) return old;
          return [...old, listItem];
        }
      );
      queryClient.setQueryData<StoreWithCount[]>([api.stores.list.path], (old) =>
        old ? old.map(s => s.id === listItem.storeId ? { ...s, itemCount: s.itemCount + 1 } : s) : old
      );
    });

    es.addEventListener("store:list:updated", (e) => {
      const listItem: StoreListItemWithItem = JSON.parse(e.data);
      queryClient.setQueryData<StoreListItemWithItem[]>(
        [api.stores.getList.path, listItem.storeId],
        (old) => old ? old.map(i => i.id === listItem.id ? listItem : i) : old
      );
    });

    es.addEventListener("store:list:removed", (e) => {
      const { storeId, listItemId }: { storeId: number; listItemId: number } = JSON.parse(e.data);
      queryClient.setQueryData<StoreListItemWithItem[]>(
        [api.stores.getList.path, storeId],
        (old) => old ? old.filter(i => i.id !== listItemId) : old
      );
      queryClient.setQueryData<StoreWithCount[]>([api.stores.list.path], (old) =>
        old ? old.map(s => s.id === storeId ? { ...s, itemCount: Math.max(0, s.itemCount - 1) } : s) : old
      );
    });

    es.addEventListener("store:list:reordered", (e) => {
      const { storeId }: { storeId: number } = JSON.parse(e.data);
      queryClient.invalidateQueries({ queryKey: [api.stores.getList.path, storeId] });
    });

    es.onerror = () => {
      es.close();
      setTimeout(() => { esRef.current = new EventSource("/api/events"); }, 3000);
    };

    return () => { es.close(); };
  }, []);
}
