import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();

    } catch (error) {

      // If offline, return cached data instead of throwing
      if (!navigator.onLine) {
        console.log("Offline — using cached data");
        return queryClient.getQueryData(queryKey);
      }

      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),

      // IMPORTANT CHANGES
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      refetchInterval: 10000, // refresh every 10 seconds
      refetchIntervalInBackground: false,
     
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});

/* --------------------------
   OFFLINE CACHE PERSISTENCE
--------------------------- */

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
});

/* --------------------------
   REFRESH WHEN CONNECTION RETURNS
--------------------------- */

window.addEventListener("online", () => {
  console.log("Connection restored — refreshing data");
  queryClient.invalidateQueries();
});

window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    console.log("App visible — refreshing data");
    queryClient.invalidateQueries();
  }
});