import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";

import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { PwaUpdater } from "@/components/pwa-update";
import { ItemsProvider, useItems } from "@/context/items-context";
import { StoreProvider, useStoreContext } from "@/context/store-context";
import { useSync } from "@/hooks/use-sync";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";

import { useAuth } from "@/hooks/use-auth";

import NotFound from "@/pages/not-found";
import ShoppingList from "@/pages/shopping-list";
import Database from "@/pages/database";
import Login from "@/pages/login";

// =============================================
// NETWORK STATUS BANNER
// =============================================

function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-orange-500 text-white text-center py-2 text-sm">
        ⚠ Offline mode — changes will sync automatically
      </div>
    </div>
  );
}

// =============================================
// SYNC BRIDGE
// This sits inside both context providers so
// it can read and write to both of them.
// It's a separate component so the sync logic
// doesn't clutter AppInner.
// =============================================

function SyncBridge({ accountId }: { accountId: number }) {
  const {
    items,
    setItems,
    setAccountId: setItemsAccountId,
  } = useItems();

  const {
    stores,
    storeLists,
    setStores,
    setStoreListItems,
    setAccountId: setStoreAccountId,
  } = useStoreContext();

  // Pass accountId down into both contexts
  // so every enqueue call knows which account
  // to tag the row with.
  useEffect(() => {
    setItemsAccountId(accountId);
    setStoreAccountId(accountId);
  }, [accountId, setItemsAccountId, setStoreAccountId]);

  // Pass the raw grouped storeLists object — use-sync.ts flattens
  // it internally before merging, then passes itemsById through so
  // setStoreListItems can re-attach item snapshots for any device.
  const getLocalStoreListItems = () => storeLists;

  useSync({
    accountId,
    onItemsPulled: setItems,
    onStoresPulled: setStores,
    onStoreListItemsPulled: (merged, itemsById) => setStoreListItems(merged, itemsById),
    getLocalItems: () => items,
    getLocalStores: () => stores,
    getLocalStoreListItems,
  });

  return null;
}

// =============================================
// APP INNER
// =============================================

function AppInner() {
  const { data: auth, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth) {
    return <Login onSuccess={() => setLocation("/")} />;
  }

  return (
    <Layout auth={auth}>

      {/* Wire up sync now that we have an accountId */}
      <SyncBridge accountId={auth.account.id} />

      <Switch>
        <Route path="/" component={ShoppingList} />
        <Route path="/database" component={Database} />
        <Route component={NotFound} />
      </Switch>

    </Layout>
  );
}

// =============================================
// APP ROOT
// =============================================

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>

          <ItemsProvider>
            <StoreProvider>

              <NetworkStatus />
              <Toaster />
              <PwaUpdater />
              <AppInner />

            </StoreProvider>
          </ItemsProvider>

        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}