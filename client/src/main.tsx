import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { processOfflineQueue } from "@/lib/offlineQueue";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

import App from "./App";
import "./index.css";

registerSW({ immediate: true });

const queryClient = new QueryClient();

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

persistQueryClient({
  queryClient,
  persister,
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

processOfflineQueue();

window.addEventListener("online", () => {
  processOfflineQueue();
});