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
  // Receives merged flat list rows + a map of itemId→item so
  // setStoreListItems can re-attach snapshots for any device's items.
  onStoreListItemsPulled: (items: any[], itemsById: Map<number, any>) => void;
  getLocalItems: () => any[];
  getLocalStores: () => any[];
  // Returns grouped StoreLists shape: { [storeId]: StoreListItem[] }
  getLocalStoreListItems: () => any;
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

      // --- ITEMS ---
      // Merge and update, then build an itemsById map from the
      // result so store list items can look up their snapshots.
      let mergedItems: any[] = getLocalItems();
      if (remoteItems && remoteItems.length > 0) {
        mergedItems = mergeRows(getLocalItems(), remoteItems);
        onItemsPulled(mergedItems);
      }

      // Build id → item lookup from fully merged items list.
      // This lets setStoreListItems resolve names/categories even
      // for items that were added on a different device.
      const itemsById = new Map<number, any>(
        mergedItems.map((item: any) => [Number(item.id), item])
      );

      // --- STORES ---
      if (remoteStores && remoteStores.length > 0) {
        const merged = mergeRows(getLocalStores(), remoteStores);
        onStoresPulled(merged);
      }

      // --- STORE LIST ITEMS ---
      if (remoteListItems && remoteListItems.length > 0) {
        // getLocalStoreListItems returns grouped shape { [storeId]: [] }
        // mergeRows needs a flat array — flatten it first.
        const localGrouped = getLocalStoreListItems();
        const localFlat: any[] = Object.values(localGrouped).flat();

        // Before merging, stamp each local row with its item snapshot
        // so mergeRows doesn't lose it when the local row wins.
        // Remote rows only carry item_id, not the full snapshot.
        const localFlatWithSnapshot = localFlat.map((row: any) => ({
          ...row,
          // Keep item nested so mergeRows preserves it on local-wins
          item: row.item ?? { id: row.item_id, name: "Unknown" },
        }));

        const merged = mergeRows(localFlatWithSnapshot, remoteListItems);
        onStoreListItemsPulled(merged, itemsById);
      }

      // Flush after pulling so we don't overwrite remote data
      // with a stale local push before we've seen what's there.
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