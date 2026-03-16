import { useEffect, useRef, useCallback } from "react";
import { flushQueue, pullItems, pullStores, pullStoreListItems, mergeRows, getQueue } from "@/lib/supabase-sync";

// =============================================
// TYPES
// =============================================

type SyncHandlers = {
  accountId: number;
  onItemsPulled: (items: any[]) => void;
  onStoresPulled: (stores: any[]) => void;
  // Receives merged flat list + itemsById map so snapshots
  // can be re-attached even for items from another device.
  onStoreListItemsPulled: (items: any[], itemsById: Map<number, any>) => void;
  getLocalItems: () => any[];
  getLocalStores: () => any[];
  // Returns grouped StoreLists shape: { [storeId]: StoreListItem[] }
  getLocalStoreListItems: () => any;
  // When true (shopping list page), sync every 10s instead of 30s
  fastSync?: boolean;
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
    fastSync = false,
  } = handlers;

  const initialSyncDone = useRef(false);

  // =============================================
  // FULL SYNC
  // 1. Pull latest from Supabase
  // 2. Merge with local state
  // 3. Flush any queued local changes up
  //
  // Pull-before-flush means we always see the
  // full remote state before pushing, so we
  // never overwrite another device's changes.
  // =============================================

  const runSync = useCallback(async () => {
    if (!accountId) return;

    console.log("[sync] Running full sync...");

    try {
      // Build set of IDs that are pending sync so mergeRows knows
      // not to drop them even if they're missing from remote yet.
      const pendingIds = new Set(
        getQueue().map(op => Number(op.payload?.id)).filter(Boolean)
      );

      // Pull all three tables in parallel
      const [remoteItems, remoteStores, remoteListItems] = await Promise.all([
        pullItems(accountId),
        pullStores(accountId),
        pullStoreListItems(accountId),
      ]);

      // --- ITEMS ---
      let mergedItems: any[] = getLocalItems();
      if (remoteItems && remoteItems.length > 0) {
        mergedItems = mergeRows(getLocalItems(), remoteItems, pendingIds);
        onItemsPulled(mergedItems);
      }

      // Build id → item lookup from the fully merged items list.
      const itemsById = new Map<number, any>(
        mergedItems.map((item: any) => [Number(item.id), item])
      );

      // --- STORES ---
      if (remoteStores && remoteStores.length > 0) {
        const merged = mergeRows(getLocalStores(), remoteStores, pendingIds);
        onStoresPulled(merged);
      }

      // --- STORE LIST ITEMS ---
      // Allow empty remote — means all items deleted on another device.
      // Only skip entirely if null (a Supabase error occurred).
      if (remoteListItems !== null) {
        const remoteList = remoteListItems ?? [];
        const localGrouped = getLocalStoreListItems();
        const localFlat: any[] = Object.values(localGrouped).flat();

        const localFlatWithSnapshot = localFlat.map((row: any) => ({
          ...row,
          item: row.item ?? { id: Number(row.item_id), name: "Unknown" },
        }));

        const merged = remoteList.length > 0
          ? mergeRows(localFlatWithSnapshot, remoteList, pendingIds)
          : [];

        onStoreListItemsPulled(merged, itemsById);
      }

      // Flush after pulling so we don't overwrite remote data
      // with stale local changes before seeing what's there.
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
  // =============================================

  useEffect(() => {
    if (!accountId || initialSyncDone.current) return;
    initialSyncDone.current = true;
    runSync();
  }, [accountId, runSync]);

  // =============================================
  // ON RECONNECT
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
  // 10s on shopping list page, 30s elsewhere
  // =============================================

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) runSync();
    }, fastSync ? 10_000 : 30_000);
    return () => clearInterval(interval);
  }, [runSync, fastSync]);

  return { runSync };
}