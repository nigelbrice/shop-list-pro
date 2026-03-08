import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Item, InsertItem, UpdateItemRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { safeFetch } from "@/lib/offlineQueue";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function useItems() {
  const online = navigator.onLine;

  return useQuery<Item[]>({
    queryKey: [api.items.list.path],
    enabled: online,
    staleTime: Infinity,
    refetchOnReconnect: true,

    queryFn: async () => {
      const res = await safeFetch(api.items.list.path, {
        credentials: "include",
      });

      if (!res?.ok) throw new Error("Failed to fetch items");

      return api.items.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Item | null, unknown, InsertItem, { previousItems?: Item[] }>({
    mutationFn: async (data) => {
      const res = await safeFetch(api.items.create.path, {
        method: api.items.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res?.ok) return null;

      // Skip parsing when offline queue response
      if (res.status === 202) {
        return null;
      }

      return api.items.create.responses[201].parse(await res.json());
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
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Item | undefined, unknown, { id: number } & UpdateItemRequest>({
    mutationFn: async ({ id, ...updates }) => {
      const url = buildUrl(api.items.update.path, { id });

      const res = await safeFetch(url, {
        method: api.items.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res?.ok) return;

      if (res.status === 202) return;

      return api.items.update.responses[200].parse(await res.json());
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

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, unknown, number, { previousItems?: Item[] }>({
    mutationFn: async (id) => {
      const url = buildUrl(api.items.delete.path, { id });

      const res = await safeFetch(url, {
        method: api.items.delete.method,
        credentials: "include",
      });

      if (!res?.ok) return;
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

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
    },
  });
}

export function useReorderItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, unknown, number[]>({
    mutationFn: async (orderedIds) => {
      const res = await safeFetch(api.items.reorder.path, {
        method: api.items.reorder.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
        credentials: "include",
      });

      if (!res?.ok) return;
    },

    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });

      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}