import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Item, InsertItem, UpdateItemRequest } from "@shared/schema";

import { useToast } from "@/hooks/use-toast";
import { safeFetch } from "@/lib/offlineQueue";

import {
  saveItem,
  getItems,
  updateLocalItem,
  deleteLocalItem,
} from "@/lib/localDB";

import { syncItems } from "@/lib/sync";
import { addToQueue } from "@/lib/changeQueue";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

/* ===============================
   GET ITEMS (Offline First)
================================ */

export function useItems() {
  const queryClient = useQueryClient();

  return useQuery<Item[]>({
    queryKey: [api.items.list.path],
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,

    queryFn: async () => {
      // 1️⃣ Load from IndexedDB instantly
      const localItems = await getItems();

      // 2️⃣ Refresh from server in background
      (async () => {
        try {
          const res = await safeFetch(api.items.list.path, {
            credentials: "include",
          });

          if (res?.ok) {
            const items =
              api.items.list.responses[200].parse(await res.json());

            // store latest items locally
            for (const item of items) {
              await saveItem({ ...item, synced: true });
            }

            // update React Query cache
            queryClient.setQueryData([api.items.list.path], items);
          }
        } catch {
          // ignore network failures
        }
      })();

      // 3️⃣ Return local data immediately
      return localItems as Item[];
    },
  });
}

/* ===============================
   CREATE ITEM
================================ */

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Item, unknown, InsertItem, { previousItems?: Item[] }>({
    mutationFn: async (data) => {
      const localItem = await saveItem({
        ...data,
        completed: false,
        synced: false,
      });

      addToQueue({
        type: "create",
        payload: localItem,
      });

      syncItems();

      return localItem as Item;
    },

    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: [api.items.list.path] });

      const previousItems = queryClient.getQueryData<Item[]>([
        api.items.list.path,
      ]);

      const optimisticItem: Item = {
        ...(newItem as Item),
        id: crypto.randomUUID(),
        completed: false,
      };

      queryClient.setQueryData<Item[]>([api.items.list.path], (old) =>
        old ? [...old, optimisticItem] : [optimisticItem]
      );

      return { previousItems };
    },

    onError: (error, _newItem, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData([api.items.list.path], context.previousItems);
      }

      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stores.list.path] });
    },
  });
}

/* ===============================
   UPDATE ITEM
================================ */

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    Item | undefined,
    unknown,
    { id: string } & UpdateItemRequest,
    { previousItems?: Item[] }
  >({
    mutationFn: async ({ id, ...updates }) => {
      const updated = await updateLocalItem(id, updates);

      addToQueue({
        type: "update",
        payload: { id, updates },
      });

      syncItems();

      return updated as Item;
    },

    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: [api.items.list.path] });

      const previousItems = queryClient.getQueryData<Item[]>([
        api.items.list.path,
      ]);

      queryClient.setQueryData<Item[]>([api.items.list.path], (old) =>
        old
          ? old.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            )
          : old
      );

      return { previousItems };
    },

    onError: (error, _vars, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData([api.items.list.path], context.previousItems);
      }

      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stores.list.path] });
    },
  });
}

/* ===============================
   DELETE ITEM
================================ */

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    void,
    unknown,
    string,
    { previousItems?: Item[] }
  >({
    mutationFn: async (id) => {
      await deleteLocalItem(id);

      addToQueue({
        type: "delete",
        payload: { id },
      });

      syncItems();
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [api.items.list.path] });

      const previousItems = queryClient.getQueryData<Item[]>([
        api.items.list.path,
      ]);

      queryClient.setQueryData<Item[]>([api.items.list.path], (old) =>
        old ? old.filter((item) => item.id !== id) : []
      );

      return { previousItems };
    },

    onError: (error, _id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData([api.items.list.path], context.previousItems);
      }

      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.stores.list.path] });
    },
  });
}