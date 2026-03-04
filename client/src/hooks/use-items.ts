import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Item, InsertItem, UpdateItemRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useItems() {
  return useQuery({
    queryKey: [api.items.list.path],
    queryFn: async () => {
      const res = await fetch(api.items.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      // Zod custom schemas allow pass-through if not strictly typed with runtime validation,
      // parsing here ensures the structure passes validation defined in routes
      return api.items.list.responses[200].parse(await res.json()) as Item[];
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertItem) => {
      const res = await fetch(api.items.create.path, {
        method: api.items.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create item");
      return api.items.create.responses[201].parse(await res.json()) as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
      toast({
        title: "Item created",
        description: "Your item has been added to the database.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateItemRequest) => {
      const url = buildUrl(api.items.update.path, { id });
      const res = await fetch(url, {
        method: api.items.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update item");
      return api.items.update.responses[200].parse(await res.json()) as Item;
    },
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.items.delete.path, { id });
      const res = await fetch(url, {
        method: api.items.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
      toast({
        title: "Item deleted",
        description: "The item has been permanently removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
