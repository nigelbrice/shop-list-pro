import { useEffect, useRef, useCallback } from "react";
import { flushQueue, pullItems, pullStores, pullStoreListItems, mergeRows } from "@/lib/supabase-sync";

// =============================================
// TYPES
// =============================================

type SyncHandlers = {
  accountId: number;
  onItemsPulled: (items: any[]) => void;
  onStoresPulled: (stores: any[]) => void;
  onStoreListItemsPulled: (items: any[], itemsById: Map<number, any>) => void;
  getLocalItems: () => any[];
  getLocalStores: () => any[];
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
      // Pull all three tables in parallel
      const [remoteItems, remoteStores, remoteListItems] = await Promise.all([
        pullItems(accountId),
        pullStores(accountId),
        pullStoreListItems(accountId),
      ]);

      // ---- DIAGNOSTIC LOGS (remove after testing) ----
      console.log("[diag] remoteItems:", JSON.stringify(remoteItems?.slice(0, 3)));
      console.log("[diag] remoteListItems:", JSON.stringify(remoteListItems?.slice(0, 3)));
      console.log("[diag] localItems:", JSON.stringify(getLocalItems().slice(0, 3)));
      const localGroupedDiag = getLocalStoreListItems();
      const localFlatDiag: any[] = Object.values(localGroupedDiag).flat();
      console.log("[diag] localStoreListItems (flat):", JSON.stringify(localFlatDiag.slice(0, 3)));
      // -------------------------------------------------

      // --- ITEMS ---
      // Merge first so we can build itemsById for snapshot lookup below.
      let mergedItems: any[] = getLocalItems();
      if (remoteItems && remoteItems.length > 0) {
        mergedItems = mergeRows(getLocalItems(), remoteItems);
        onItemsPulled(mergedItems);
      }

      // Build id → item lookup from the fully merged items list.
      // This lets setStoreListItems resolve name/category even for
      // items that were added on a different device.
      const itemsById = new Map<number, any>(
        mergedItems.map((item: any) => [Number(item.id), item])
      );
      console.log("[diag] itemsById keys:", Array.from(itemsById.keys()));

      // --- STORES ---
      if (remoteStores && remoteStores.length > 0) {
        const merged = mergeRows(getLocalStores(), remoteStores);
        onStoresPulled(merged);
      }

      // --- STORE LIST ITEMS ---
      if (remoteListItems && remoteListItems.length > 0) {
        // getLocalStoreListItems() returns grouped shape { [storeId]: [] }
        // mergeRows needs a flat array — flatten it here.
        const localGrouped = getLocalStoreListItems();
        const localFlat: any[] = Object.values(localGrouped).flat();

        // Stamp each local row with its item snapshot so mergeRows
        // preserves it when the local row wins the timestamp comparison.
        // Remote rows only carry item_id, not the full item object.
        const localFlatWithSnapshot = localFlat.map((row: any) => ({
          ...row,
          item: row.item ?? { id: Number(row.item_id), name: "Unknown" },
        }));

        const merged = mergeRows(localFlatWithSnapshot, remoteListItems);
        console.log("[diag] merged store list items:", JSON.stringify(merged.slice(0, 3)));

        onStoreListItemsPulled(merged, itemsById);
      }

      // Flush after pulling — this way our local changes go up
      // after we've already seen what's in Supabase, so we never
      // accidentally overwrite fresher data from another device.
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