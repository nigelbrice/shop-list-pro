import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { StoreWithCount, StoreListItemWithItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useStores() {
  return useQuery<StoreWithCount[]>({
    queryKey: [api.stores.list.path],
    queryFn: async () => {
      const res = await fetch(api.stores.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stores");
      return res.json();
    },
  });
}


export function useCreateStore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(api.stores.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create store");
      return res.json() as Promise<StoreWithCount>;
    },
    onSuccess: (newStore) => {
      queryClient.setQueryData<StoreWithCount[]>([api.stores.list.path], (old) => {
        const withCount: StoreWithCount = { ...newStore, itemCount: newStore.itemCount ?? 0 };
        if (!old) return [withCount];
        if (old.some(s => s.id === withCount.id)) return old;
        return [...old, withCount];
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.stores.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete store");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stores.list.path] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useStoreList(storeId: number | null) {
  return useQuery<StoreListItemWithItem[]>({
    queryKey: [api.stores.getList.path, storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const url = buildUrl(api.stores.getList.path, { storeId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch store list");
      return res.json();
    },
    enabled: storeId != null,
  });
}

export function useAddToStoreList(storeId: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity?: number }) => {
      if (!storeId) throw new Error("No store selected");
      const url = buildUrl(api.stores.addToList.path, { storeId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity: quantity ?? 1 }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add to list");
      return res.json() as Promise<StoreListItemWithItem>;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<StoreListItemWithItem[]>(
        [api.stores.getList.path, storeId],
        (old) => {
          if (!old) return [newItem];
          if (old.some(i => i.id === newItem.id)) return old;
          return [...old, newItem];
        }
      );
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateStoreListItem(storeId: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ listItemId, quantity }: { listItemId: number; quantity: number }) => {
      if (!storeId) throw new Error("No store selected");
      const url = buildUrl(api.stores.updateListItem.path, { storeId, listItemId });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update quantity");
      return res.json() as Promise<StoreListItemWithItem>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<StoreListItemWithItem[]>(
        [api.stores.getList.path, storeId],
        (old) => old ? old.map(i => i.id === updated.id ? updated : i) : old
      );
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useRemoveFromStoreList(storeId: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (listItemId: number) => {
      if (!storeId) throw new Error("No store selected");
      const url = buildUrl(api.stores.removeFromList.path, { storeId, listItemId });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to remove from list");
    },
    onSuccess: (_, listItemId) => {
      queryClient.setQueryData<StoreListItemWithItem[]>(
        [api.stores.getList.path, storeId],
        (old) => old ? old.filter(i => i.id !== listItemId) : old
      );
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useReorderStoreList(storeId: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orderedIds: number[]) => {
      if (!storeId) throw new Error("No store selected");
      const url = buildUrl(api.stores.reorderList.path, { storeId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reorder list");
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: [api.stores.getList.path, storeId] });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
