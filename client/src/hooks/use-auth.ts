import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { AccountUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export interface AuthState {
  account: { id: number; name: string };
  users: AccountUser[];
  activeUserId: number | null;
}

export function useAuth() {
  return useQuery<AuthState | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (data: { accountName: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json() as Promise<AuthState>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: { accountName: string; password: string; userName: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json() as Promise<AuthState>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });
}

export function useAddMember() {
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/auth/users", { name });
      return res.json() as Promise<AccountUser>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });
}

export function useDeleteMember() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/auth/users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });
}

export function useSwitchUser() {
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", "/api/auth/switch-user", { userId });
      return res.json() as Promise<AccountUser>;
    },
    onSuccess: (_, userId) => {
      queryClient.setQueryData<AuthState | null>(["/api/auth/me"], (old) =>
        old ? { ...old, activeUserId: userId } : old
      );
    },
  });
}
