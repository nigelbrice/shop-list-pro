import { supabase } from "./supabase";

// =============================================
// TYPES
// =============================================

export type PendingOp = {
  id: string;
  table: "items" | "stores" | "store_list_items";
  action: "upsert" | "delete";
  payload: any;
  accountId: number;
  timestamp: string;
};

const QUEUE_KEY = "shopeeze_pending_ops";

// =============================================
// PENDING QUEUE HELPERS
// =============================================

export function getQueue(): PendingOp[] {
  try {
    const saved = localStorage.getItem(QUEUE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingOp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(op: Omit<PendingOp, "id" | "timestamp">) {
  const queue = getQueue();

  // Replace any existing pending op for the same row
  // so we don't send redundant updates
  const filtered = queue.filter(
    (existing) =>
      !(
        existing.table === op.table &&
        existing.payload?.id === op.payload?.id
      )
  );

  const newOp: PendingOp = {
    ...op,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
  };

  saveQueue([...filtered, newOp]);

  // Try to flush immediately if online
  if (navigator.onLine) {
    flushQueue().catch(() => {});
  }
}

function dequeue(opId: string) {
  const queue = getQueue().filter((op) => op.id !== opId);
  saveQueue(queue);
}

// =============================================
// FLUSH QUEUE — push local changes to Supabase
// =============================================

export async function flushQueue(): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  console.log(`[sync] Flushing ${queue.length} pending operations...`);

  // Sort so parent tables sync before child tables.
  // stores must exist in Supabase before store_list_items can reference them.
  const TABLE_ORDER: Record<PendingOp["table"], number> = {
    items: 0,
    stores: 1,
    store_list_items: 2,
  };
  const sorted = [...queue].sort(
    (a, b) => TABLE_ORDER[a.table] - TABLE_ORDER[b.table]
  );

  for (const op of sorted) {
    try {
      if (op.action === "upsert") {
        const { error } = await supabase
          .from(op.table)
          .upsert(op.payload, { onConflict: "id" });

        if (error) throw error;

      } else if (op.action === "delete") {
        const { error } = await supabase
          .from(op.table)
          .delete()
          .eq("id", op.payload.id)
          .eq("account_id", op.accountId);

        if (error) throw error;
      }

      dequeue(op.id);
      console.log(`[sync] ✓ ${op.action} ${op.table} id=${op.payload?.id}`);

    } catch (err) {
      console.warn(`[sync] ✗ Failed to sync ${op.table} id=${op.payload?.id}:`, err);
    }
  }
}

// =============================================
// PULL — fetch latest data from Supabase
// =============================================

export async function pullItems(accountId: number) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("account_id", accountId);

  if (error) {
    console.warn("[sync] Could not pull items:", error.message);
    return null;
  }
  return data;
}

export async function pullStores(accountId: number) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("account_id", accountId);

  if (error) {
    console.warn("[sync] Could not pull stores:", error.message);
    return null;
  }
  return data;
}

export async function pullStoreListItems(accountId: number) {
  const { data, error } = await supabase
    .from("store_list_items")
    .select("*")
    .eq("account_id", accountId);

  if (error) {
    console.warn("[sync] Could not pull store list items:", error.message);
    return null;
  }
  return data;
}

// =============================================
// MERGE HELPER
// Merges local and remote arrays by id.
// The row with the most recent updated_at wins.
// Rows only in remote get added locally.
// Rows only in local stay (may be pending sync).
// =============================================

export function mergeRows<T extends { id: number | string; updated_at?: string }>(
  local: T[],
  remote: T[],
  pendingIds?: Set<number>
): T[] {
  const merged = new Map<number, T>();
  const remoteIds = new Set(remote.map(r => Number(r.id)));

  // Always coerce id to number — Supabase returns bigint columns
  // as strings, but local state stores them as numbers. Without
  // this, the same row gets two Map entries and remote always wins,
  // wiping out the local item snapshot (name, category etc.).
  for (const row of local) {
    const id = Number(row.id);
    // Only keep local-only rows if they have a pending sync op.
    // If they're not pending and not in remote, they were deleted
    // on another device and should be removed locally too.
    if (!remoteIds.has(id)) {
      if (pendingIds?.has(id)) {
        merged.set(id, row); // keep — not yet pushed to Supabase
      }
      // else: drop — deleted on another device
    } else {
      merged.set(id, row);
    }
  }

  for (const row of remote) {
    const id = Number(row.id);
    const existing = merged.get(id);

    if (!existing) {
      // New row from another device — add it
      merged.set(id, { ...row, id } as any);
    } else {
      const localTime = new Date(existing.updated_at ?? 0).getTime();
      const remoteTime = new Date(row.updated_at ?? 0).getTime();

      if (remoteTime > localTime) {
        // Remote is newer — use it but preserve local imageUrl
        // and item snapshot since those aren't stored in Supabase.
        merged.set(id, {
          ...row,
          id,
          imageUrl: (existing as any).imageUrl ?? (row as any).imageUrl,
          item: (existing as any).item ?? (row as any).item,
        } as any);
      }
    }
  }

  return Array.from(merged.values());
}