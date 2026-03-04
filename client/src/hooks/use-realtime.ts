import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Item } from "@shared/schema";

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

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        esRef.current = new EventSource("/api/events");
      }, 3000);
    };

    return () => {
      es.close();
    };
  }, []);
}
