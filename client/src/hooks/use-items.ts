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

export function useItems() {
  return useQuery<Item[]>({
    queryKey: [api.items.list.path],
    enabled: true,
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,

    queryFn: async () => {
      try {
        const res = await safeFetch(api.items.list.path, {
          credentials: "include",
        });

        if (res?.ok) {
          const items = api.items.list.responses[200].parse(await res.json());

          // store locally for offline
          for (const item of items) {
            await saveItem({ ...item, synced: true });
          }

          return items;
        }
      } catch {
        // ignore network errors
      }

      // fallback to localDB
      return (await getItems()) as Item[];
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Item | null, unknown, InsertItem, { previousItems?: Item[] }>({
    mutationFn: async (data) => {
      const localItem = await saveItem({
        ...data,
        completed: false,
      });

      addToQueue({
        type: "create",
        payload: data,
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
        id: Date.now(),
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

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Item | undefined, unknown, { id: number } & UpdateItemRequest>({
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

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, unknown, number, { previousItems?: Item[] }>({
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