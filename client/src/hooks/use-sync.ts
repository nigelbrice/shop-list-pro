import { useEffect, useRef, useCallback } from "react";
import { flushQueue, pullItems, pullStores, pullStoreListItems, mergeRows } from "@/lib/supabase-sync";

// =============================================
// TYPES
// =============================================

// The hook needs to know how to update each
// piece of local state after a pull from
// Supabase. We pass in setter functions from
// the context providers.
type SyncHandlers = {
  accountId: number;
  onItemsPulled: (items: any[]) => void;
  onStoresPulled: (stores: any[]) => void;
  onStoreListItemsPulled: (items: any[]) => void;
  getLocalItems: () => any[];
  getLocalStores: () => any[];
  getLocalStoreListItems: () => any[];
};

// =============================================
// HOOK
// =============================================

export function useSync(handlers: SyncHandlers) {
  const {
    accountId,
    onItemsPulled,
    onStoresPulled,
    onStoreListItemsPulled,
    getLocalItems,
    getLocalStores,
    getLocalStoreListItems,
  } = handlers;

  // We use a ref to track whether we've done
  // the initial load sync yet this session.
  const initialSyncDone = useRef(false);

  // =============================================
  // FULL SYNC
  // Pull latest from Supabase, merge with local,
  // then flush any queued local changes up.
  // =============================================

  const runSync = useCallback(async () => {
    if (!accountId) return;

    console.log("[sync] Running full sync...");

    try {
      // Pull all three tables in parallel
      const [remoteItems, remoteStores, remoteListItems] = await Promise.all([
        pullItems(accountId),
        pullStores(accountId),
        pullStoreListItems(accountId),
      ]);

      // Merge remote into local and update state
      if (remoteItems) {
        const merged = mergeRows(getLocalItems(), remoteItems);
        onItemsPulled(merged);
      }

      if (remoteStores) {
        const merged = mergeRows(getLocalStores(), remoteStores);
        onStoresPulled(merged);
      }

      if (remoteListItems) {
        const merged = mergeRows(getLocalStoreListItems(), remoteListItems);
        onStoreListItemsPulled(merged);
      }

      // After pulling, flush any queued local changes
      // so other users get our offline edits too.
      await flushQueue();

      console.log("[sync] Full sync complete.");

    } catch (err) {
      console.warn("[sync] Sync failed:", err);
    }
  }, [
    accountId,
    onItemsPulled,
    onStoresPulled,
    onStoreListItemsPulled,
    getLocalItems,
    getLocalStores,
    getLocalStoreListItems,
  ]);

  // =============================================
  // ON APP LOAD
  // Run a full sync once when the app first
  // loads and we have an accountId.
  // =============================================

  useEffect(() => {
    if (!accountId || initialSyncDone.current) return;
    initialSyncDone.current = true;
    runSync();
  }, [accountId, runSync]);

  // =============================================
  // ON RECONNECT
  // When the browser fires the "online" event
  // it means wifi / data just came back.
  // We run a full sync at that point to:
  //   1. Pick up changes other users made
  //   2. Flush our own offline changes up
  // =============================================

  useEffect(() => {
    const handleOnline = () => {
      console.log("[sync] Back online — syncing...");
      runSync();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [runSync]);

  // =============================================
  // PERIODIC SYNC
  // Also sync every 30 seconds while online
  // so the shopping list stays fresh if two
  // users are in the store at the same time.
  // =============================================

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        runSync();
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [runSync]);

  return { runSync };
}